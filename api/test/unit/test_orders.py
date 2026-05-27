from test.shared.app import AppTestCase
from test.shared.sessions import (
    create_staff_test_session,
    create_test_session,
)


def _create_product(
    client, *, name="Smart Sensor", code="SNSR-001", price_cents=5000, stock=10
):
    """Helper: create a product as staff and return its ID."""
    create_staff_test_session(
        client, email="product.staff@example.com", password="Harbour84!"
    )
    response = client.post(
        "/api/admin/products",
        json={
            "name": name,
            "code": code,
            "mediaUrls": [],
            "priceCents": price_cents,
            "stock": stock,
            "type": "Sensor",
        },
    )
    assert response.status_code == 201
    product = response.get_json()
    client.delete_cookie("iotbay_test_session")
    return product["id"]


def _login_customer(client, **kwargs):
    """Helper: create and authenticate a customer session."""
    return create_test_session(client, **kwargs)


class CreateOrderTestCase(AppTestCase):
    def test_create_order_returns_201_with_order_details(self):
        """AC: authenticated customer can place an order."""
        product_id = _create_product(self.client)
        _login_customer(self.client)

        response = self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 2}],
            },
        )

        self.assertEqual(response.status_code, 201)
        order = response.get_json()
        self.assertEqual(order["status"], "saved")
        self.assertEqual(order["totalCents"], 11200)
        self.assertEqual(len(order["items"]), 1)
        self.assertEqual(order["items"][0]["productId"], product_id)
        self.assertEqual(order["items"][0]["quantity"], 2)
        self.assertEqual(order["items"][0]["priceCents"], 5000)
        self.assertIn("id", order)
        self.assertIn("createdAt", order)

    def test_create_order_decrements_product_stock(self):
        """AC: stock is reduced when an order is placed."""
        product_id = _create_product(self.client, stock=10)
        _login_customer(self.client)

        self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 3}],
            },
        )

        product = self.client.get(f"/api/products/{product_id}").get_json()
        self.assertEqual(product["stock"], 7)

    def test_create_order_rejects_insufficient_stock(self):
        """AC: order fails if requested quantity exceeds available stock."""
        product_id = _create_product(self.client, stock=2)
        _login_customer(self.client)

        response = self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 5}],
            },
        )

        self.assertEqual(response.status_code, 409)
        body = response.get_json()
        self.assertEqual(body["code"], "INSUFFICIENT_STOCK")

    def test_create_order_rejects_empty_items(self):
        """AC: order must contain at least one item."""
        _login_customer(self.client)

        response = self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [],
            },
        )

        self.assertEqual(response.status_code, 400)

    def test_create_order_rejects_invalid_product_id(self):
        """AC: order fails if product does not exist."""
        _login_customer(self.client)

        response = self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [
                    {"productId": "00000000-0000-0000-0000-000000000000", "quantity": 1}
                ],
            },
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json()["code"], "PRODUCT_NOT_FOUND")

    def test_create_order_rejects_zero_quantity(self):
        """AC: quantity must be at least 1."""
        product_id = _create_product(self.client)
        _login_customer(self.client)

        response = self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 0}],
            },
        )

        self.assertEqual(response.status_code, 400)

    def test_create_order_requires_authentication(self):
        """AC: unauthenticated requests are rejected."""
        response = self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": "any-id", "quantity": 1}],
            },
        )

        self.assertEqual(response.status_code, 401)

    def test_create_order_rejects_staff_users(self):
        """AC: only customers can place orders."""
        product_id = _create_product(self.client)
        create_staff_test_session(self.client)

        response = self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )

        self.assertEqual(response.status_code, 403)


class ListOrdersTestCase(AppTestCase):
    def test_list_orders_returns_user_orders_only(self):
        """AC: customer sees only their own orders."""
        product_id = _create_product(self.client)
        _login_customer(self.client, email="alice@example.com")
        self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )
        self.client.delete_cookie("iotbay_test_session")
        _login_customer(self.client, email="bob@example.com")

        response = self.client.get("/api/orders")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), [])

    def test_list_orders_returns_all_orders_for_owner(self):
        """AC: customer sees all their placed orders."""
        product_id = _create_product(self.client)
        _login_customer(self.client)
        self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )
        self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 2}],
            },
        )

        response = self.client.get("/api/orders")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.get_json()), 2)

    def test_list_orders_filters_by_date(self):
        """AC: date filter narrows results."""
        product_id = _create_product(self.client)
        _login_customer(self.client)
        self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )

        response = self.client.get("/api/orders?date=2999-01-01")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), [])

    def test_get_order_by_id(self):
        """AC: customer can retrieve a specific order."""
        product_id = _create_product(self.client)
        _login_customer(self.client)
        create_resp = self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )
        order_id = create_resp.get_json()["id"]

        response = self.client.get(f"/api/orders/{order_id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["id"], order_id)

    def test_get_order_returns_404_for_other_users_order(self):
        """AC: customer cannot access another user's order."""
        product_id = _create_product(self.client)
        _login_customer(self.client, email="alice@example.com")
        create_resp = self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )
        order_id = create_resp.get_json()["id"]

        self.client.delete_cookie("iotbay_test_session")
        _login_customer(self.client, email="bob@example.com")

        response = self.client.get(f"/api/orders/{order_id}")

        self.assertEqual(response.status_code, 404)

    def test_list_orders_requires_authentication(self):
        """AC: unauthenticated requests are rejected."""
        response = self.client.get("/api/orders")
        self.assertEqual(response.status_code, 401)


class UpdateOrderStatusTestCase(AppTestCase):
    def test_customer_can_cancel_saved_order(self):
        """AC: customer can cancel an order in 'saved' status."""
        product_id = _create_product(self.client, stock=10)
        _login_customer(self.client)
        create_resp = self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 3}],
            },
        )
        order_id = create_resp.get_json()["id"]

        response = self.client.patch(
            f"/api/orders/{order_id}/status",
            json={"status": "cancelled"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["status"], "cancelled")

    def test_cancel_restores_product_stock(self):
        """AC: cancelling an order restores the reserved stock."""
        product_id = _create_product(self.client, stock=10)
        _login_customer(self.client)
        create_resp = self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 3}],
            },
        )
        order_id = create_resp.get_json()["id"]

        self.client.patch(
            f"/api/orders/{order_id}/status",
            json={"status": "cancelled"},
        )

        product = self.client.get(f"/api/products/{product_id}").get_json()
        self.assertEqual(product["stock"], 10)  # fully restored

    def test_customer_cannot_set_status_to_paid(self):
        """AC: customers may only cancel, not mark as paid."""
        product_id = _create_product(self.client)
        _login_customer(self.client)
        create_resp = self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )
        order_id = create_resp.get_json()["id"]

        response = self.client.patch(
            f"/api/orders/{order_id}/status",
            json={"status": "paid"},
        )

        self.assertEqual(response.status_code, 403)

    def test_cannot_cancel_already_cancelled_order(self):
        """AC: terminal states cannot be transitioned from."""
        product_id = _create_product(self.client)
        _login_customer(self.client)
        create_resp = self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )
        order_id = create_resp.get_json()["id"]
        self.client.patch(
            f"/api/orders/{order_id}/status",
            json={"status": "cancelled"},
        )

        response = self.client.patch(
            f"/api/orders/{order_id}/status",
            json={"status": "cancelled"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["code"], "INVALID_STATUS_TRANSITION")

    def test_cannot_update_other_users_order_status(self):
        """AC: ownership check prevents cross-user modifications."""
        product_id = _create_product(self.client)
        _login_customer(self.client, email="alice@example.com")
        create_resp = self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )
        order_id = create_resp.get_json()["id"]

        self.client.delete_cookie("iotbay_test_session")
        _login_customer(self.client, email="bob@example.com")

        response = self.client.patch(
            f"/api/orders/{order_id}/status",
            json={"status": "cancelled"},
        )

        self.assertEqual(response.status_code, 404)

    def test_invalid_status_value_is_rejected(self):
        """AC: only valid status values are accepted."""
        product_id = _create_product(self.client)
        _login_customer(self.client)
        create_resp = self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )
        order_id = create_resp.get_json()["id"]

        response = self.client.patch(
            f"/api/orders/{order_id}/status",
            json={"status": "shipped"},
        )

        self.assertEqual(response.status_code, 400)


class UpdateOrderAddressTestCase(AppTestCase):
    def test_update_address_on_saved_order(self):
        """AC: customer can update shipping address on a saved order."""
        product_id = _create_product(self.client)
        _login_customer(self.client)
        create_resp = self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )
        order_id = create_resp.get_json()["id"]

        response = self.client.patch(
            f"/api/orders/{order_id}/address",
            json={
                "addressLineOne": "42 Wallaby Way",
                "addressLineTwo": "Unit 3",
                "suburb": "Sydney",
                "state": "NSW",
                "postcode": "2000",
                "country": "AU",
            },
        )

        self.assertEqual(response.status_code, 200)
        order = response.get_json()
        self.assertEqual(order["shippingAddressLineOne"], "42 Wallaby Way")
        self.assertEqual(order["shippingSuburb"], "Sydney")
        self.assertEqual(order["shippingState"], "NSW")
        self.assertEqual(order["shippingPostcode"], "2000")
        self.assertEqual(order["shippingCountry"], "AU")

    def test_cannot_update_address_on_cancelled_order(self):
        """AC: address updates are blocked for non-saved orders."""
        product_id = _create_product(self.client)
        _login_customer(self.client)
        create_resp = self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )
        order_id = create_resp.get_json()["id"]
        self.client.patch(
            f"/api/orders/{order_id}/status",
            json={"status": "cancelled"},
        )

        response = self.client.patch(
            f"/api/orders/{order_id}/address",
            json={
                "addressLineOne": "New Address",
                "suburb": "Melbourne",
                "state": "VIC",
                "postcode": "3000",
                "country": "AU",
            },
        )

        self.assertEqual(response.status_code, 400)

    def test_cannot_update_other_users_order_address(self):
        """AC: ownership check prevents cross-user address edits."""
        product_id = _create_product(self.client)
        _login_customer(self.client, email="alice@example.com")
        create_resp = self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )
        order_id = create_resp.get_json()["id"]

        self.client.delete_cookie("iotbay_test_session")
        _login_customer(self.client, email="bob@example.com")

        response = self.client.patch(
            f"/api/orders/{order_id}/address",
            json={"addressLineOne": "Hacked"},
        )

        self.assertEqual(response.status_code, 404)


class AdminListAllOrdersTestCase(AppTestCase):
    def test_staff_can_list_all_orders(self):
        """AC: staff users can view all customer orders."""
        product_id = _create_product(self.client)
        _login_customer(self.client, email="alice@example.com")
        self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )
        self.client.delete_cookie("iotbay_test_session")
        _login_customer(self.client, email="bob@example.com")
        self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )

        self.client.delete_cookie("iotbay_test_session")
        create_staff_test_session(self.client)

        response = self.client.get("/api/staff/all")

        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body["total"], 2)
        self.assertEqual(len(body["items"]), 2)
        self.assertIn("pages", body)

    def test_staff_can_filter_by_date(self):
        """AC: staff can filter orders by creation date."""
        product_id = _create_product(self.client)
        _login_customer(self.client)
        self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )
        self.client.delete_cookie("iotbay_test_session")
        create_staff_test_session(self.client)

        response = self.client.get("/api/staff/all?date=2999-01-01")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["total"], 0)

    def test_staff_can_search_by_order_id(self):
        """AC: staff can search by specific order ID."""
        product_id = _create_product(self.client)
        _login_customer(self.client)
        create_resp = self.client.post(
            "/api/orders",
            json={
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )
        order_id = create_resp.get_json()["id"]
        self.client.delete_cookie("iotbay_test_session")
        create_staff_test_session(self.client)

        response = self.client.get(f"/api/staff/all?orderId={order_id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["total"], 1)

    def test_customer_cannot_access_admin_orders(self):
        """AC: admin endpoint requires staff role."""
        _login_customer(self.client)

        response = self.client.get("/api/staff/all")

        self.assertEqual(response.status_code, 403)

    def test_pagination_returns_correct_page_metadata(self):
        """AC: pagination metadata is accurate."""
        product_id = _create_product(self.client, stock=100)
        _login_customer(self.client)
        # Create 25 orders (page size is 20)
        for _ in range(25):
            self.client.post(
                "/api/orders",
                json={
                    "addressId": None,
                    "items": [{"productId": product_id, "quantity": 1}],
                },
            )
        self.client.delete_cookie("iotbay_test_session")
        create_staff_test_session(self.client)

        page1 = self.client.get("/api/staff/all").get_json()
        page2 = self.client.get("/api/staff/all?page=2").get_json()

        self.assertEqual(page1["total"], 25)
        self.assertEqual(page1["pages"], 2)
        self.assertEqual(len(page1["items"]), 20)
        self.assertEqual(len(page2["items"]), 5)


class CartOrderIntegrationTestCase(AppTestCase):
    def test_cart_add_item_and_retrieve(self):
        """AC: customer can add items to cart and retrieve them."""
        product_id = _create_product(self.client)
        _login_customer(self.client)

        add_response = self.client.post(
            "/api/cart/items",
            json={
                "productId": product_id,
                "quantity": 2,
            },
        )

        self.assertEqual(add_response.status_code, 201)
        cart = add_response.get_json()
        self.assertEqual(len(cart["items"]), 1)
        self.assertEqual(cart["items"][0]["productId"], product_id)
        self.assertEqual(cart["items"][0]["quantity"], 2)

    def test_cart_update_quantity(self):
        """AC: adding same product updates quantity."""
        product_id = _create_product(self.client)
        _login_customer(self.client)
        self.client.post(
            "/api/cart/items",
            json={
                "productId": product_id,
                "quantity": 2,
            },
        )

        response = self.client.post(
            "/api/cart/items",
            json={
                "productId": product_id,
                "quantity": 5,
            },
        )

        cart = response.get_json()
        self.assertEqual(cart["items"][0]["quantity"], 5)

    def test_cart_remove_item(self):
        """AC: customer can remove a specific item from cart."""
        product_id = _create_product(self.client)
        _login_customer(self.client)
        self.client.post(
            "/api/cart/items",
            json={
                "productId": product_id,
                "quantity": 1,
            },
        )

        response = self.client.delete(f"/api/cart/items/{product_id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["items"], [])

    def test_cart_clear_all_items(self):
        """AC: customer can clear entire cart."""
        product_id = _create_product(self.client)
        _login_customer(self.client)
        self.client.post(
            "/api/cart/items",
            json={
                "productId": product_id,
                "quantity": 1,
            },
        )

        response = self.client.delete("/api/cart/items")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["items"], [])

    def test_cart_requires_customer_role(self):
        """AC: staff users cannot use the cart."""
        create_staff_test_session(self.client)

        response = self.client.get("/api/cart")

        self.assertEqual(response.status_code, 403)

    def test_cart_requires_authentication(self):
        """AC: unauthenticated users cannot access cart."""
        response = self.client.get("/api/cart")
        self.assertEqual(response.status_code, 401)
