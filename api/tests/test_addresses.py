from src.config import load_address_config
from tests.helpers.test_case import AppTestCase


class AddressRoutesTests(AppTestCase):
    def test_suggest_addresses_returns_items(self) -> None:
        self._skip_if_address_service_is_not_configured()

        response = self.client.get(
            "/api/addresses/suggest?q=12%20Harbour%20Road%20Sydney"
        )
        if response.status_code == 503:
            self.skipTest("Google Maps address lookup is unavailable")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIsInstance(payload, dict)
        items = payload["items"]
        self.assertGreater(len(items), 0)
        self.assertTrue(items[0]["id"])
        self.assertTrue(items[0]["label"])

    def test_resolve_address_returns_structured_fields(self) -> None:
        self._skip_if_address_service_is_not_configured()

        suggest_response = self.client.get(
            "/api/addresses/suggest?q=12%20Harbour%20Road%20Sydney"
        )
        if suggest_response.status_code == 503:
            self.skipTest("Google Maps address lookup is unavailable")
        self.assertEqual(suggest_response.status_code, 200)
        suggest_payload = suggest_response.get_json()
        self.assertIsInstance(suggest_payload, dict)
        items = suggest_payload["items"]
        self.assertGreater(len(items), 0)

        response = self.client.get(f"/api/addresses/resolve?id={items[0]['id']}")
        if response.status_code == 503:
            self.skipTest("Google Maps address lookup is unavailable")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIsInstance(payload, dict)
        address = payload["address"]
        self.assertEqual(address["provider"], "google")
        self.assertTrue(address["addressLineOne"])
        self.assertTrue(address["suburb"])
        self.assertTrue(address["state"])
        self.assertTrue(address["postcode"])
        self.assertTrue(address["country"])
        self.assertTrue(address["formattedAddress"])
        self.assertTrue(address["placeId"])

    def _skip_if_address_service_is_not_configured(self) -> None:
        if not load_address_config().google_maps_api_key.strip():
            self.skipTest("Google Maps API key is not configured")
