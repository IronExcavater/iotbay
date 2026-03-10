import tempfile
import unittest

from src.app import create_app


class HealthRouteTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self._temp_dir = tempfile.TemporaryDirectory()
        database_path = f"{self._temp_dir.name}/test.sqlite3"

        app = create_app(database_path=database_path)
        app.testing = True
        self.client = app.test_client()

    def tearDown(self) -> None:
        self._temp_dir.cleanup()

    def test_health_endpoint(self) -> None:
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok"})


if __name__ == "__main__":
    unittest.main()
