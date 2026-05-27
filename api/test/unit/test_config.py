import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from src.config import load_app_config


class AppConfigTestCase(unittest.TestCase):
    def test_environment_overrides_deployment_settings(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            database_path = str(Path(temp_dir) / "render.sqlite3")
            config_path = self._write_config(Path(temp_dir))

            with patch.dict(
                os.environ,
                {
                    "IOTBAY_COOKIE_SAMESITE": "None",
                    "IOTBAY_COOKIE_SECURE": "true",
                    "IOTBAY_DATABASE_PATH": database_path,
                    "IOTBAY_WEB_URL": "https://ironexcavater.github.io/iotbay",
                },
            ):
                config = load_app_config(config_path)

        self.assertEqual(config.cookie_samesite, "None")
        self.assertTrue(config.cookie_secure)
        self.assertEqual(config.database_path, database_path)
        self.assertEqual(config.web_url, "https://ironexcavater.github.io/iotbay")

    def test_relative_database_path_is_resolved_from_config_file(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            config_path = self._write_config(root)

            with patch.dict(os.environ, {}, clear=True):
                config = load_app_config(config_path)

        expected_path = str((root / "../data/test.sqlite3").resolve())
        self.assertEqual(config.database_path, expected_path)

    def _write_config(self, root: Path) -> Path:
        config_path = root / "app.json"
        config_path.write_text(
            json.dumps(
                {
                    "cookieSecure": False,
                    "databasePath": "../data/test.sqlite3",
                    "loginMfaLifetimeSeconds": 300,
                    "sessionCookieName": "iotbay_session",
                    "sessionLifetimeSeconds": 86400,
                    "trustedSessionCookieName": "iotbay_trusted_session",
                    "trustedSessionLifetimeSeconds": 604800,
                    "verificationCodeLifetimeSeconds": 900,
                    "webUrl": "http://localhost:5173",
                }
            ),
            encoding="utf-8",
        )
        return config_path
