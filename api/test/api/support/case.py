import unittest

from test.api.support.clients import AccessLogsApi, AuditApi, AuthApi, SessionsApi
from test.shared.live_app import JsonHttpClient, LiveAppFixture
from test.shared.users import TestCustomer, create_customer


class ApiAcceptanceTestCase(unittest.TestCase):
    access_logs: AccessLogsApi
    audit: AuditApi
    auth: AuthApi
    fixture: LiveAppFixture
    http: JsonHttpClient
    sessions: SessionsApi

    def setUp(self) -> None:
        super().setUp()
        self.fixture = self.enterContext(LiveAppFixture())
        if self.fixture.client is None:
            raise RuntimeError("live API test client was not created")
        self.http = self.fixture.client
        self.access_logs = AccessLogsApi(self.http)
        self.audit = AuditApi(self.http)
        self.auth = AuthApi(self.http)
        self.sessions = SessionsApi(self.http)

    def given_customer(
        self,
        *,
        email: str = "access.customer@example.com",
        password: str = "LogPass99$",
    ) -> TestCustomer:
        return create_customer(
            self.fixture.user_repository,
            email=email,
            password=password,
        )

    def given_logged_in_customer(
        self,
        *,
        email: str = "access.customer@example.com",
        password: str = "LogPass99$",
        user_agent: str = "Mozilla/5.0 Chrome/123.0 Windows",
    ) -> TestCustomer:
        customer = self.given_customer(email=email, password=password)
        response = self.auth.login_customer(
            email=customer.email,
            password=customer.password,
            user_agent=user_agent,
        )
        self.assertEqual(response.status, 200)
        return customer
