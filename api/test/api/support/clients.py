from urllib.parse import urlencode

from test.shared.live_app import HttpResponse, JsonHttpClient


class AuthApi:
    def __init__(self, http: JsonHttpClient) -> None:
        self.http = http

    def login_customer(
        self,
        *,
        email: str,
        password: str,
        user_agent: str = "Mozilla/5.0 Chrome/123.0 Windows",
    ) -> HttpResponse:
        return self.http.post(
            "/api/login",
            {
                "email": email,
                "password": password,
                "userType": "customer",
            },
            user_agent=user_agent,
        )

    def logout(self) -> HttpResponse:
        return self.http.post("/api/logout")


class AccessLogsApi:
    def __init__(self, http: JsonHttpClient) -> None:
        self.http = http

    def list(
        self,
        *,
        event_type: str = "",
        from_date: str = "",
        to_date: str = "",
    ) -> HttpResponse:
        params: dict[str, str] = {}
        if event_type:
            params["eventType"] = event_type
        if from_date:
            params["fromDate"] = from_date
        if to_date:
            params["toDate"] = to_date

        query = f"?{urlencode(params)}" if params else ""
        return self.http.get(f"/api/access-logs{query}")

    def delete_collection(self) -> HttpResponse:
        return self.http.request("DELETE", "/api/access-logs")

    def update_collection(self) -> HttpResponse:
        return self.http.request("PATCH", "/api/access-logs", {"eventType": "logout"})


class AuditApi:
    def __init__(self, http: JsonHttpClient) -> None:
        self.http = http

    def user_events(self, user_id: str) -> HttpResponse:
        return self.http.get(f"/api/audit/entities/user/{user_id}")


class SessionsApi:
    def __init__(self, http: JsonHttpClient) -> None:
        self.http = http

    def list(self) -> HttpResponse:
        return self.http.get("/api/me/sessions")

    def revoke(self, session_id: str) -> HttpResponse:
        return self.http.request("DELETE", f"/api/me/sessions/{session_id}")
