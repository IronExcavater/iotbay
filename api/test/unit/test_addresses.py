import unittest

from src.config import load_address_config

from test.unit.helpers.app_case import AppTestCase

LIVE_ADDRESS_QUERY = "200 George Street Sydney"


class AddressRouteTestCase(AppTestCase):
    def test_suggest_short_query_returns_empty_items(self) -> None:
        response = self.client.get(
            "/api/addresses/suggest",
            query_string={"q": "ab"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"items": []})

    def test_resolve_requires_address_id(self) -> None:
        response = self.client.get("/api/addresses/resolve")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {"code": "ADDRESS_INVALID", "error": "address id is required"},
        )

    def test_suggest_and_resolve_return_address_shape(self) -> None:
        self._skip_if_address_lookup_is_not_configured()
        suggestion = self._first_live_suggestion()

        response = self.client.get(
            "/api/addresses/resolve",
            query_string={"id": suggestion["id"]},
        )
        if response.status_code != 200:
            self.skipTest("Google Maps address lookup is unavailable")

        payload = response.get_json()
        self.assertIsNotNone(payload)
        address = payload["address"]
        self.assertEqual(address["provider"], "google")

        for field in (
            "placeId",
            "formattedAddress",
            "addressLineOne",
            "suburb",
            "state",
            "postcode",
            "country",
        ):
            with self.subTest(field=field):
                self.assertIsInstance(address[field], str)
                self.assertTrue(address[field].strip())

    def _skip_if_address_lookup_is_not_configured(self) -> None:
        if not load_address_config().google_maps_api_key.strip():
            self.skipTest("Google Maps API key is not configured")

    def _first_live_suggestion(self) -> dict[str, str]:
        response = self.client.get(
            "/api/addresses/suggest",
            query_string={"q": LIVE_ADDRESS_QUERY},
        )
        if response.status_code != 200:
            self.skipTest("Google Maps address lookup is unavailable")

        payload = response.get_json()
        self.assertIsNotNone(payload)
        items = payload["items"]
        if not items:
            self.skipTest("Google Maps address lookup is unavailable")

        suggestion = items[0]
        self.assertIsInstance(suggestion["id"], str)
        self.assertTrue(suggestion["id"].strip())
        self.assertIsInstance(suggestion["label"], str)
        self.assertTrue(suggestion["label"].strip())
        self.assertIn("subtitle", suggestion)
        return suggestion


if __name__ == "__main__":
    unittest.main()
