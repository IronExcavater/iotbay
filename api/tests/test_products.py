from tests.helpers.test_case import AppTestCase
from tests.helpers.test_session import create_staff_test_session, create_test_session


class ProductRouteTestCase(AppTestCase):
    def test_list_products_starts_empty(self) -> None:
        response = self.client.get("/api/products")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"items": []})

    def test_create_product_and_list(self) -> None:
        create_staff_test_session(self.client)
        create_response = self.client.post(
            "/api/admin/products",
            json={
                "name": "Smart Sensor",
                "code": "snsr-001",
                "priceCents": 12999,
            },
        )

        self.assertEqual(create_response.status_code, 201)
        created = create_response.get_json()

        self.assertIsNotNone(created)
        self.assertEqual(created["name"], "Smart Sensor")
        self.assertEqual(created["code"], "SNSR-001")
        self.assertEqual(created["priceCents"], 12999)

        list_response = self.client.get("/api/products")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.get_json()["items"]), 1)

    def test_create_product_duplicate_code_returns_conflict(self) -> None:
        create_staff_test_session(self.client)
        payload = {
            "name": "Smart Hub",
            "code": "hub-001",
            "priceCents": 25999,
        }

        first = self.client.post("/api/admin/products", json=payload)
        second = self.client.post("/api/admin/products", json=payload)

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 409)
        self.assertEqual(
            second.get_json(),
            {
                "code": "PRODUCT_CODE_EXISTS",
                "error": "code already exists",
            },
        )

    def test_create_product_invalid_price_returns_bad_request(self) -> None:
        create_staff_test_session(self.client)
        response = self.client.post(
            "/api/admin/products",
            json={
                "name": "Broken Price",
                "code": "bad-price",
                "priceCents": "abc",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {
                "error": (
                    "Input should be a valid integer, unable to parse "
                    "string as an integer"
                )
            },
        )

    def test_create_product_missing_code_returns_bad_request(self) -> None:
        create_staff_test_session(self.client)
        response = self.client.post(
            "/api/admin/products",
            json={
                "name": "No Code",
                "priceCents": 500,
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {"error": "Field required"},
        )

    def test_create_product_requires_staff_auth(self) -> None:
        response = self.client.post(
            "/api/admin/products",
            json={
                "name": "Smart Sensor",
                "code": "SNSR-001",
                "priceCents": 12999,
            },
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.get_json(),
            {"error": "authentication is required"},
        )

    def test_create_product_rejects_customer_auth(self) -> None:
        create_test_session(self.client)
        response = self.client.post(
            "/api/admin/products",
            json={
                "name": "Smart Sensor",
                "code": "SNSR-001",
                "priceCents": 12999,
            },
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.get_json(),
            {
                "code": "STAFF_ACCOUNT_REQUIRED",
                "error": "staff account is required",
            },
        )

    def test_update_and_delete_product(self) -> None:
        create_staff_test_session(self.client)
        created = self.client.post(
            "/api/admin/products",
            json={
                "name": "Smart Sensor",
                "code": "snsr-001",
                "priceCents": 12999,
            },
        ).get_json()
        assert created is not None

        update_response = self.client.patch(
            f"/api/admin/products/{created['id']}",
            json={
                "name": "Smart Sensor Pro",
                "code": "snsr-002",
                "priceCents": 14999,
            },
        )

        self.assertEqual(update_response.status_code, 200)
        updated = update_response.get_json()
        self.assertEqual(updated["name"], "Smart Sensor Pro")
        self.assertEqual(updated["code"], "SNSR-002")
        self.assertEqual(updated["priceCents"], 14999)
        self.assertEqual(updated["createdAt"], created["createdAt"])
        self.assertNotEqual(updated["updatedAt"], created["updatedAt"])

        delete_response = self.client.delete(f"/api/admin/products/{created['id']}")
        self.assertEqual(delete_response.status_code, 204)
        self.assertEqual(self.client.get("/api/products").get_json(), {"items": []})
