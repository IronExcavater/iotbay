import contextlib
import os
import tempfile
import threading
from pathlib import Path
from shutil import copyfile
from unittest.mock import patch

from flask import Flask
from src.app import create_app
from src.common.app import extension_from
from src.config import load_app_config
from src.users.repository import UserRepository
from werkzeug.serving import BaseWSGIServer, make_server

from test.shared.http import DEFAULT_TEST_API_KEY, HttpResponse, JsonHttpClient

__all__ = ["DEFAULT_TEST_API_KEY", "HttpResponse", "JsonHttpClient", "LiveAppFixture"]

TEST_CONFIG_PATH = Path(__file__).resolve().parents[2] / "config" / "test.json"


class LiveAppFixture:
    def __init__(
        self,
        *,
        api_key: str = DEFAULT_TEST_API_KEY,
        api_port: int = 0,
    ) -> None:
        self.api_key = api_key
        self.api_port = api_port
        self._context_stack = contextlib.ExitStack()
        self._server: BaseWSGIServer | None = None
        self._server_thread: threading.Thread | None = None
        self.app: Flask | None = None
        self.base_url = ""
        self.client: JsonHttpClient | None = None
        self.config_path: Path | None = None
        self.database_path = ""

    def __enter__(self) -> "LiveAppFixture":
        try:
            self._context_stack.enter_context(
                patch.dict(
                    os.environ,
                    {
                        "IOTBAY_API_KEY": self.api_key,
                        "IOTBAY_SMTP_HOST": "",
                        "IOTBAY_SMTP_PASSWORD": "",
                        "IOTBAY_SMTP_USERNAME": "",
                    },
                )
            )
            temp_dir = Path(
                self._context_stack.enter_context(tempfile.TemporaryDirectory())
            )
            config_dir = temp_dir / "config"
            config_dir.mkdir()
            self.config_path = config_dir / "test.json"
            copyfile(TEST_CONFIG_PATH, self.config_path)

            self.database_path = load_app_config(self.config_path).database_path
            self.app = create_app(str(self.config_path))

            self._server = make_server("127.0.0.1", self.api_port, self.app)
            self.base_url = f"http://127.0.0.1:{self._server.server_port}"
            self.client = JsonHttpClient(self.base_url, api_key=self.api_key)
            self._server_thread = threading.Thread(
                target=self._server.serve_forever,
                daemon=True,
            )
            self._server_thread.start()
            return self
        except Exception:
            self._context_stack.close()
            raise

    def __exit__(self, *exc_info: object) -> None:
        if self._server is not None:
            self._server.shutdown()
        if self._server_thread is not None:
            self._server_thread.join(timeout=5)
        self._context_stack.close()

    @property
    def user_repository(self) -> UserRepository:
        if self.app is None:
            raise RuntimeError("live app fixture is not running")
        return extension_from(self.app, "user_repository", UserRepository)
