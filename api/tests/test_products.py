import tempfile
import unittest
from pathlib import Path

from tests.context.app import create_test_client


class ProductRouteTestCase(unittest.TestCase):
    def setUp(self) -> None:
        super().setUp()
        temp_dir = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.client, _ = create_test_client(temp_dir)

    def test_list_products_starts_empty(self) -> None:
        response = self.client.get("/api/products")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"items": []})

    def test_create_product_and_list(self) -> None:
        create_response = self.client.post(
            "/api/products",
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
        payload = {
            "name": "Smart Hub",
            "code": "hub-001",
            "priceCents": 25999,
        }

        first = self.client.post("/api/products", json=payload)
        second = self.client.post("/api/products", json=payload)

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 409)
        self.assertEqual(second.get_json(), {"error": "code already exists"})

    def test_create_product_invalid_price_returns_bad_request(self) -> None:
        response = self.client.post(
            "/api/products",
            json={
                "name": "Broken Price",
                "code": "bad-price",
                "priceCents": "abc",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {"error": "priceCents must be an integer"},
        )

    def test_create_product_missing_code_returns_bad_request(self) -> None:
        response = self.client.post(
            "/api/products",
            json={
                "name": "No Code",
                "priceCents": 500,
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {"error": "code is required"},
        )


if __name__ == "__main__":
    unittest.main()
