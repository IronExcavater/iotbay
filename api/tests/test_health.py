from tests.helpers.test_case import AppTestCase


class HealthRouteTestCase(AppTestCase):
    def test_health_endpoint(self) -> None:
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok"})

    def test_health_endpoint_requires_api_key(self) -> None:
        response = self.client.get(
            "/api/health",
            environ_overrides={"HTTP_X_API_KEY": ""},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.get_json(),
            {"code": "API_KEY_REQUIRED", "error": "api key is required"},
        )

    def test_health_endpoint_rejects_invalid_api_key(self) -> None:
        response = self.client.get(
            "/api/health",
            headers={"x-api-key": "wrong-key"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.get_json(),
            {"code": "API_KEY_INVALID", "error": "api key is invalid"},
        )
