from tests.helpers.test_case import AppTestCase


class HealthRouteTestCase(AppTestCase):
    def test_health_endpoint(self) -> None:
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok"})
