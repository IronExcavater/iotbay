import unittest

from src.access_logs.models import ACCESS_EVENT_LOGIN, ACCESS_EVENT_LOGOUT
from src.common.app import services_from
from src.common.clock import UtcTime
from src.db import connect

from test.shared.app import AppTestCase
from test.shared.sessions import create_test_session
from test.unit.support.access_logs import create_access_log_fixture


class AccessLogRepositoryTestCase(AppTestCase):
    def test_access_log_stores_user_session_timestamp_and_device_metadata(self) -> None:
        """AC: access log records persist user id, session id, timestamp and device."""
        fixture = create_access_log_fixture(
            self.client,
            occurred_at="2026-05-04T09:00:00.000000+00:00",
            user_agent="Mozilla/5.0 Chrome/123.0 Windows",
        )

        logs = services_from(
            self.client.application
        ).access_log_repository.list_user_access_logs(user_id=fixture.user.user_id)

        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].event_type, ACCESS_EVENT_LOGIN)
        self.assertEqual(logs[0].occurred_at, "2026-05-04T09:00:00.000000+00:00")
        self.assertEqual(logs[0].session_id, fixture.session.session_id)
        self.assertEqual(logs[0].user_id, fixture.user.user_id)
        self.assertEqual(logs[0].to_dict()["deviceLabel"], "Chrome on Windows")

    def test_access_log_returns_current_joined_user_profile(self) -> None:
        """AC: access logs show current user profile data instead of snapshots."""
        fixture = create_access_log_fixture(
            self.client,
            email="old.access@example.com",
            occurred_at="2026-05-04T09:00:00.000000+00:00",
        )
        services = services_from(self.client.application)

        services.user_repository.update_user(
            user_id=fixture.user.user_id,
            email="new.access@example.com",
            first_name="Updated",
            last_name="Person",
            profile_image_url="data:image/png;base64,updated",
            updated_at=UtcTime.now().iso,
        )
        logs = services.access_log_repository.list_user_access_logs(
            user_id=fixture.user.user_id,
        )
        payload = logs[0].to_dict()

        self.assertEqual(payload["userEmail"], "new.access@example.com")
        self.assertEqual(payload["userFirstName"], "Updated")
        self.assertEqual(payload["userLastName"], "Person")
        self.assertEqual(payload["userName"], "Updated Person")
        self.assertEqual(
            payload["userProfileImageUrl"],
            "data:image/png;base64,updated",
        )

    def test_access_log_repository_filters_by_date_range(self) -> None:
        """AC: access logs can be searched by date."""
        first = create_access_log_fixture(
            self.client,
            email="first.access@example.com",
            occurred_at="2026-05-04T09:00:00.000000+00:00",
        )
        create_access_log_fixture(
            self.client,
            email="second.access@example.com",
            occurred_at="2026-05-05T09:00:00.000000+00:00",
        )

        logs = services_from(
            self.client.application
        ).access_log_repository.list_user_access_logs(
            user_id=first.user.user_id,
            from_date="2026-05-04",
            to_date="2026-05-04",
        )

        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].user_id, first.user.user_id)
        self.assertTrue(logs[0].occurred_at.startswith("2026-05-04"))

    def test_logout_updates_session_and_writes_logout_access_log(self) -> None:
        """AC: logout timestamp is stored in the session and access log table."""
        session = create_test_session(self.client)

        response = self.client.post("/api/logout")

        self.assertEqual(response.status_code, 204)
        with connect(self.database_path) as connection:
            stored_session = connection.execute(
                "SELECT ended_at, ended_reason FROM user_sessions WHERE user_id = ?",
                (session.user.user_id,),
            ).fetchone()
            logs = connection.execute(
                "SELECT event_type FROM access_logs WHERE user_id = ?",
                (session.user.user_id,),
            ).fetchall()

        self.assertIsNotNone(stored_session["ended_at"])
        self.assertEqual(stored_session["ended_reason"], "logout")
        self.assertEqual([row["event_type"] for row in logs], [ACCESS_EVENT_LOGOUT])

    def test_session_revocation_writes_user_audit_event(self) -> None:
        """AC: access-management changes are auditable."""
        session = create_test_session(self.client)
        second_client = self.client.application.test_client()
        second_client.environ_base.update(self.client.environ_base)
        second_login_response = second_client.post(
            "/api/login",
            json={"email": session.email, "password": session.password},
        )
        self.assertEqual(second_login_response.status_code, 200)
        sessions = self.client.get("/api/me/sessions").get_json()["items"]
        other_session = next(item for item in sessions if not item["isCurrent"])

        revoke_response = self.client.delete(f"/api/me/sessions/{other_session['id']}")
        timeline_response = self.client.get(
            f"/api/audit/entities/user/{session.user.id}"
        )

        self.assertEqual(revoke_response.status_code, 200)
        self.assertEqual(timeline_response.status_code, 200)
        self.assertIn(
            "session_revoked",
            [item["action"] for item in timeline_response.get_json()["events"]],
        )


if __name__ == "__main__":
    unittest.main()
