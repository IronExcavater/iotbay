import http.cookiejar
import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from json import JSONDecodeError
from typing import Any

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


def _read_json_payload(raw_body: bytes) -> object:
    if not raw_body:
        return None

    text = raw_body.decode("utf-8")
    try:
        return json.loads(text)
    except JSONDecodeError:
        return text
