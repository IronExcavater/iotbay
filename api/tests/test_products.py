from tests.helpers.app_case import AppTestCase
from tests.helpers.session_factory import (
    create_staff_test_session,
    create_test_session,
)


class ProductRouteTestCase(AppTestCase):
    def test_list_products_starts_empty(self) -> None:
        response = self.client.get("/api/products")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"items": []})

    def test_create_product_and_list(self) -> None:
        create_staff_test_session(self.client)
        media_urls = ["data:image/png;base64,aW90YmF5"]
        create_response = self.client.post(
            "/api/admin/products",
            json={
                "name": "Smart Sensor",
                "code": "snsr-001",
                "mediaUrls": media_urls,
                "priceCents": 12999,
            },
        )

        self.assertEqual(create_response.status_code, 201)
        created = create_response.get_json()
        self.assertIsNotNone(created)
        self.assertEqual(created["name"], "Smart Sensor")
        self.assertEqual(created["code"], "SNSR-001")
        self.assertEqual(created["mediaUrls"], media_urls)
        self.assertEqual(created["priceCents"], 12999)
        listed_products = self.client.get("/api/products").get_json()["items"]
        self.assertEqual(len(listed_products), 1)
        self.assertEqual(listed_products[0]["mediaUrls"], media_urls)

    def test_create_product_requires_staff_access(self) -> None:
        unauthenticated_response = self.client.post(
            "/api/admin/products",
            json={
                "name": "Smart Sensor",
                "code": "SNSR-001",
                "priceCents": 12999,
            },
        )
        self.assertEqual(unauthenticated_response.status_code, 401)
        self.assertEqual(
            unauthenticated_response.get_json(),
            {"error": "authentication is required"},
        )

        create_test_session(self.client)
        customer_response = self.client.post(
            "/api/admin/products",
            json={
                "name": "Smart Sensor",
                "code": "SNSR-001",
                "priceCents": 12999,
            },
        )
        self.assertEqual(customer_response.status_code, 403)
        self.assertEqual(
            customer_response.get_json(),
            {
                "code": "STAFF_ACCOUNT_REQUIRED",
                "error": "staff account is required",
            },
        )

    def test_create_product_rejects_invalid_payloads(self) -> None:
        create_staff_test_session(self.client)
        cases = [
            (
                "invalid price",
                {
                    "name": "Broken Price",
                    "code": "bad-price",
                    "priceCents": "abc",
                },
                "Input should be a valid integer, unable to parse string as an integer",
            ),
            (
                "missing code",
                {
                    "name": "No Code",
                    "priceCents": 500,
                },
                "Field required",
            ),
        ]

        for label, payload, message in cases:
            with self.subTest(label=label):
                response = self.client.post("/api/admin/products", json=payload)
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.get_json(), {"error": message})

    def test_duplicate_update_and_delete_product(self) -> None:
        create_staff_test_session(self.client)
        payload = {
            "name": "Smart Sensor",
            "code": "snsr-001",
            "priceCents": 12999,
        }

        first = self.client.post("/api/admin/products", json=payload)
        self.assertEqual(first.status_code, 201)

        duplicate = self.client.post("/api/admin/products", json=payload)
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(
            duplicate.get_json(),
            {
                "code": "PRODUCT_CODE_EXISTS",
                "error": "code already exists",
            },
        )

        created = first.get_json()
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

        delete_response = self.client.delete(f"/api/admin/products/{created['id']}")
        self.assertEqual(delete_response.status_code, 204)
        self.assertEqual(self.client.get("/api/products").get_json(), {"items": []})
