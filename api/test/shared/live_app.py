import contextlib
import http.cookiejar
import json
import os
import tempfile
import threading
import urllib.error
import urllib.request
from dataclasses import dataclass
from json import JSONDecodeError
from pathlib import Path
from typing import Any
from unittest.mock import patch

from flask import Flask
from src.app import create_app
from src.common.app import extension_from
from src.config import load_app_config
from src.users.repository import UserRepository
from werkzeug.serving import BaseWSGIServer, make_server

DEFAULT_TEST_API_KEY = "test-api-key"


@dataclass(slots=True, frozen=True)
class HttpResponse:
    body: Any
    headers: dict[str, str]
    status: int


class JsonHttpClient:
    def __init__(self, base_url: str, *, api_key: str = DEFAULT_TEST_API_KEY) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.cookies = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.cookies)
        )

    def get(
        self,
        path: str,
        *,
        include_api_key: bool = True,
        user_agent: str | None = None,
    ) -> HttpResponse:
        return self.request(
            "GET",
            path,
            include_api_key=include_api_key,
            user_agent=user_agent,
        )

    def post(
        self,
        path: str,
        body: dict[str, object] | None = None,
        *,
        include_api_key: bool = True,
        user_agent: str | None = None,
    ) -> HttpResponse:
        return self.request(
            "POST",
            path,
            body,
            include_api_key=include_api_key,
            user_agent=user_agent,
        )

    def request(
        self,
        method: str,
        path: str,
        body: dict[str, object] | None = None,
        *,
        include_api_key: bool = True,
        user_agent: str | None = None,
    ) -> HttpResponse:
        data = None if body is None else json.dumps(body).encode("utf-8")
        headers = {"Accept": "application/json"}
        if body is not None:
            headers["Content-Type"] = "application/json"
        if include_api_key:
            headers["x-api-key"] = self.api_key
        if user_agent:
            headers["User-Agent"] = user_agent

        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=data,
            headers=headers,
            method=method,
        )

        try:
            with self.opener.open(request, timeout=5) as response:
                return HttpResponse(
                    body=_read_json_payload(response.read()),
                    headers=dict(response.headers.items()),
                    status=response.status,
                )
        except urllib.error.HTTPError as error:
            with error:
                return HttpResponse(
                    body=_read_json_payload(error.read()),
                    headers=dict(error.headers.items()),
                    status=error.code,
                )


class LiveAppFixture:
    def __init__(
        self,
        *,
        api_key: str = DEFAULT_TEST_API_KEY,
        api_port: int = 0,
        web_url: str = "http://localhost:5173",
    ) -> None:
        self.api_key = api_key
        self.api_port = api_port
        self.web_url = web_url
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
            self.config_path = _write_config(temp_dir, web_url=self.web_url)
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


def _write_config(temp_dir: Path, *, web_url: str) -> Path:
    config_dir = temp_dir / "config"
    config_dir.mkdir(parents=True)
    config_path = config_dir / "test.json"
    database_path = temp_dir / "data" / "test.sqlite3"
    config_path.write_text(
        json.dumps(
            {
                "cookieSecure": False,
                "databasePath": str(database_path),
                "loginMfaLifetimeSeconds": 300,
                "sessionCookieName": "iotbay_test_session",
                "sessionLifetimeSeconds": 86400,
                "trustedSessionCookieName": "iotbay_test_trusted_session",
                "trustedSessionLifetimeSeconds": 604800,
                "verificationCodeLifetimeSeconds": 900,
                "webUrl": web_url,
            }
        ),
        encoding="utf-8",
    )
    return config_path


def _read_json_payload(raw_body: bytes) -> object:
    if not raw_body:
        return None

    text = raw_body.decode("utf-8")
    try:
        return json.loads(text)
    except JSONDecodeError:
        return text
