from test.api.support.case import ApiAcceptanceTestCase
from test.api.support.clients import AuthApi
from test.shared.http import JsonHttpClient


class OrdersApiAcceptanceTestCase(ApiAcceptanceTestCase):
    def _create_product_as_staff(
        self, *, name="Sensor", code="SNSR-001", price_cents=5000, stock=10
    ):
        """Create a product via the staff API and return its ID."""
        staff_http = JsonHttpClient(self.fixture.base_url, api_key=self.fixture.api_key)
        staff_auth = AuthApi(staff_http)
        from test.shared.users import create_staff

        staff = create_staff(self.fixture.user_repository)
        staff_auth.login_customer(email=staff.email, password=staff.password)
        response = staff_http.post(
            "/api/admin/products",
            {
                "name": name,
                "code": code,
                "mediaUrls": [],
                "priceCents": price_cents,
                "stock": stock,
                "type": "Sensor",
            },
        )
        assert response.status == 201
        return response.body["id"]

    def test_full_order_lifecycle_create_list_cancel(self):
        """AC: complete order flow — create, list, cancel."""
        product_id = self._create_product_as_staff()

        create_response = self.http.post(
            "/api/orders",
            {
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 2}],
            },
        )
        self.assertEqual(create_response.status, 201)
        order = create_response.body
        self.assertEqual(order["status"], "saved")
        self.assertEqual(order["totalCents"], 10000)
        order_id = order["id"]

        list_response = self.http.get("/api/orders")
        self.assertEqual(list_response.status, 200)
        self.assertEqual(len(list_response.body), 1)
        self.assertEqual(list_response.body[0]["id"], order_id)

        cancel_response = self.http.request(
            "PATCH",
            f"/api/orders/{order_id}/status",
            {"status": "cancelled"},
        )
        self.assertEqual(cancel_response.status, 200)
        self.assertEqual(cancel_response.body["status"], "cancelled")

        list_after = self.http.get("/api/orders")
        self.assertEqual(list_after.body[0]["status"], "cancelled")

    def test_order_address_update_lifecycle(self):
        """AC: customer can update address on a saved order."""
        product_id = self._create_product_as_staff(code="ADDR-001")
        self.given_logged_in_customer()

        create_response = self.http.post(
            "/api/orders",
            {
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )
        order_id = create_response.body["id"]

        update_response = self.http.request(
            "PATCH",
            f"/api/orders/{order_id}/address",
            {
                "addressLineOne": "100 George St",
                "addressLineTwo": "Level 5",
                "suburb": "Sydney",
                "state": "NSW",
                "postcode": "2000",
                "country": "AU",
            },
        )

        self.assertEqual(update_response.status, 200)
        self.assertEqual(
            update_response.body["shippingAddressLineOne"], "100 George St"
        )
        self.assertIn("Sydney", update_response.body["shippingAddress"])

    def test_unauthenticated_user_cannot_create_order(self):
        """AC: session cookie is required for order creation."""
        unauthenticated_http = JsonHttpClient(
            self.fixture.base_url, api_key=self.fixture.api_key
        )

        response = unauthenticated_http.post(
            "/api/orders",
            {
                "addressId": None,
                "items": [{"productId": "any", "quantity": 1}],
            },
        )

        self.assertEqual(response.status, 401)

    def test_search_orders_by_date(self):
        """AC: date filter works over HTTP."""
        product_id = self._create_product_as_staff(code="DATE-001")
        self.given_logged_in_customer()
        self.http.post(
            "/api/orders",
            {
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )

        future_response = self.http.get("/api/orders?date=2999-12-31")
        self.assertEqual(future_response.status, 200)
        self.assertEqual(future_response.body, [])
