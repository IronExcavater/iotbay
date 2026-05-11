from test.api.support.case import ApiAcceptanceTestCase
from test.api.support.clients import AuthApi
from test.shared.http import JsonHttpClient


class AccessLogsApiAcceptanceTestCase(ApiAcceptanceTestCase):
    def test_login_and_logout_are_stored_as_user_access_logs(self) -> None:
        """AC: registered user login/logout access logs are persisted."""
        customer = self.given_customer()

        self.auth.login_customer(email=customer.email, password=customer.password)
        login_logs = self.access_logs.list(event_type="login")
        logout_response = self.auth.logout()
        self.assertEqual(logout_response.status, 204)

        self.assertEqual(login_logs.status, 200)
        self.assertEqual(len(login_logs.body["items"]), 1)
        self.assertEqual(login_logs.body["items"][0]["eventType"], "login")
        self.assertEqual(login_logs.body["items"][0]["userId"], customer.user.id)

        self.auth.login_customer(email=customer.email, password=customer.password)
        all_logs = self.access_logs.list()
        event_types = {item["eventType"] for item in all_logs.body["items"]}

        self.assertEqual(all_logs.status, 200)
        self.assertIn("login", event_types)
        self.assertIn("logout", event_types)

    def test_user_can_search_their_access_logs_by_date(self) -> None:
        """AC: registered users can filter their own access logs by date."""
        customer = self.given_logged_in_customer()
        occurred_date = self.access_logs.list().body["items"][0]["occurredAt"][:10]

        matching_response = self.access_logs.list(
            from_date=occurred_date,
            to_date=occurred_date,
        )
        future_response = self.access_logs.list(
            from_date="2999-01-01",
            to_date="2999-01-01",
        )

        self.assertEqual(matching_response.status, 200)
        self.assertEqual(len(matching_response.body["items"]), 1)
        self.assertEqual(matching_response.body["items"][0]["userId"], customer.user.id)
        self.assertEqual(future_response.status, 200)
        self.assertEqual(future_response.body["items"], [])

    def test_user_cannot_update_their_access_logs(self) -> None:
        """AC: registered users cannot modify access log records."""
        self.given_logged_in_customer()

        response = self.access_logs.update_collection()

        self.assertEqual(response.status, 405)

    def test_user_cannot_delete_their_access_logs(self) -> None:
        """AC: registered users cannot remove access log records."""
        self.given_logged_in_customer()

        response = self.access_logs.delete_collection()

        self.assertEqual(response.status, 405)

    def test_session_revocation_is_audited_for_the_user(self) -> None:
        """AC: access-management changes are captured in the audit trail."""
        customer = self.given_logged_in_customer(user_agent="First Browser")
        second_auth = AuthApi(
            JsonHttpClient(
                self.fixture.base_url,
                api_key=self.fixture.api_key,
            )
        )
        second_auth.login_customer(
            email=customer.email,
            password=customer.password,
            user_agent="Second Browser",
        )
        sessions = self.sessions.list().body["items"]
        other_session = next(
            session for session in sessions if not session["isCurrent"]
        )

        revoke_response = self.sessions.revoke(other_session["id"])
        timeline_response = self.audit.user_events(customer.user.id)

        self.assertEqual(revoke_response.status, 200)
        self.assertEqual(timeline_response.status, 200)
        self.assertIn(
            "session_revoked",
            [item["action"] for item in timeline_response.body["events"]],
        )
