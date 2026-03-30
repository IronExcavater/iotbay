import tempfile
import unittest
from pathlib import Path

from tests.context.app import create_test_client


class HealthRouteTestCase(unittest.TestCase):
    def setUp(self) -> None:
        super().setUp()
        temp_dir = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.client, _ = create_test_client(temp_dir)

    def test_health_endpoint(self) -> None:
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok"})


if __name__ == "__main__":
    unittest.main()
