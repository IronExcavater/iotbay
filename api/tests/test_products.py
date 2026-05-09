import os
import tempfile
import unittest
from pathlib import Path
from shutil import copyfile
from unittest.mock import patch

from flask.testing import FlaskClient
from src.app import create_app
from src.auth.security import hash_password, hash_session_token, new_session_token
from src.common.app import services_from
from src.common.clock import UtcTime
from src.users.models import USER_STATUS_ACTIVE, USER_TYPE_STAFF

TEST_CONFIG_PATH = Path(__file__).resolve().parents[1] / "config" / "test.json"


class ProductRouteTestCase(unittest.TestCase):
    client: FlaskClient

    def setUp(self) -> None:
        super().setUp()
        self.enterContext(
            patch.dict(
                os.environ,
                {
                    "IOTBAY_API_KEY": "test-api-key",
                    "IOTBAY_SMTP_HOST": "",
                    "IOTBAY_SMTP_PASSWORD": "",
                    "IOTBAY_SMTP_USERNAME": "",
                },
            )
        )
        temp_dir = Path(self.enterContext(tempfile.TemporaryDirectory()))
        config_dir = temp_dir / "config"
        config_dir.mkdir()
        config_path = config_dir / "test.json"
        copyfile(TEST_CONFIG_PATH, config_path)

        app = create_app(str(config_path))
        app.testing = True
        self.client = app.test_client()
        self.client.environ_base["HTTP_X_API_KEY"] = app.config["API_ACCESS_KEY"]

        repository = services_from(app).user_repository
        user = repository.insert_user(
            email="taylor.staff@example.com",
            password_hash=hash_password("Harbour84!"),
            first_name="Taylor",
            last_name="Morgan",
            user_type=USER_TYPE_STAFF,
            status=USER_STATUS_ACTIVE,
        )
        session_token = new_session_token()
        now = UtcTime.now()
        repository.insert_user_session(
            user_id=user.user_id,
            session_token_hash=hash_session_token(session_token),
            created_at=now.iso,
            expires_at=now.add(
                seconds=int(app.config["AUTH_SESSION_LIFETIME_SECONDS"])
            ).iso,
        )
        self.client.set_cookie(
            key=str(app.config["AUTH_SESSION_COOKIE_NAME"]),
            value=session_token,
            path="/",
        )

    def test_create_and_update_product_persist_free_text_type(self) -> None:
        create_response = self.client.post(
            "/api/admin/products",
            json={
                "name": "Smart Sensor",
                "code": "SNSR-001",
                "mediaUrls": [],
                "priceCents": 12999,
                "stock": 14,
                "type": "Environmental Monitor",
            },
        )

        self.assertEqual(create_response.status_code, 201)
        created = create_response.get_json()
        self.assertIsNotNone(created)
        self.assertEqual(created["type"], "Environmental Monitor")

        update_response = self.client.patch(
            f"/api/admin/products/{created['id']}",
            json={
                "name": "Smart Sensor Plus",
                "code": "SNSR-002",
                "mediaUrls": [],
                "priceCents": 14999,
                "stock": 9,
                "type": "Industrial Control Node",
            },
        )

        self.assertEqual(update_response.status_code, 200)
        updated = update_response.get_json()
        self.assertIsNotNone(updated)
        self.assertEqual(updated["type"], "Industrial Control Node")

        listed_products = self.client.get("/api/products").get_json()["items"]
        self.assertEqual(len(listed_products), 1)
        self.assertEqual(listed_products[0]["type"], "Industrial Control Node")

    def test_create_product_rejects_blank_type(self) -> None:
        response = self.client.post(
            "/api/admin/products",
            json={
                "name": "Smart Sensor",
                "code": "SNSR-001",
                "priceCents": 12999,
                "stock": 14,
                "type": "   ",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json(), {"error": "type is required"})
