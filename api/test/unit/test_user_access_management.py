import re
import unittest

from src.auth.security import hash_password
from src.common.app import extension_from
from src.db import connect
from src.users.models import USER_STATUS_ACTIVE, USER_TYPE_CUSTOMER
from src.users.repository import UserRepository

from test.unit.helpers.app_case import AppTestCase
from test.unit.helpers.session_factory import (
    create_staff_test_session,
    create_superadmin_test_session,
    create_test_session,
)


def _secondary_client(primary_client):
    client = primary_client.application.test_client()
    client.environ_base.update(primary_client.environ_base)
    return client


def _mfa_code(response) -> str:
    payload = response.get_json()
    assert payload is not None
    html = payload["download"]["html"]
    match = re.search(r">\s*(\d{6})\s*<", html)
    assert match is not None
    return match.group(1)


class UserAccessManagementTestCase(AppTestCase):
    def environment_overrides(self) -> dict[str, str]:
        return {
            "IOTBAY_SMTP_HOST": "",
            "IOTBAY_SMTP_PASSWORD": "",
            "IOTBAY_SMTP_USERNAME": "",
        }

    def test_login_logout_and_access_log_visibility(self) -> None:
        repository = extension_from(
            self.client.application,
            "user_repository",
            UserRepository,
        )
        user = repository.insert_user(
            email="logs.customer@example.com",
            password_hash=hash_password("LogPass99$"),
            first_name="Logs",
            last_name="Customer",
            user_type=USER_TYPE_CUSTOMER,
            status=USER_STATUS_ACTIVE,
        )

        login_response = self.client.post(
            "/api/login",
            json={"email": user.email, "password": "LogPass99$"},
            headers={"User-Agent": "Mozilla/5.0 Chrome/123.0 Windows"},
        )
        self.assertEqual(login_response.status_code, 200)

        logs_response = self.client.get("/api/access-logs?eventType=login")
        self.assertEqual(logs_response.status_code, 200)
        logs = logs_response.get_json()["items"]
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]["eventType"], "login")
        self.assertEqual(logs[0]["userId"], user.id)

        logout_response = self.client.post("/api/logout")
        self.assertEqual(logout_response.status_code, 204)
        self.assertEqual(self.client.get("/api/me").status_code, 401)

        with connect(self.database_path) as connection:
            session = connection.execute(
                "SELECT ended_at, ended_reason FROM user_sessions WHERE user_id = ?",
                (user.user_id,),
            ).fetchone()
            events = connection.execute(
                "SELECT event_type FROM access_logs WHERE user_id = ?",
                (user.user_id,),
            ).fetchall()

        self.assertIsNotNone(session["ended_at"])
        self.assertEqual(session["ended_reason"], "logout")
        self.assertEqual(
            sorted(row["event_type"] for row in events),
            ["login", "logout"],
        )

        create_superadmin_test_session(self.client)
        admin_logs_response = self.client.get("/api/admin/access-logs")
        self.assertEqual(admin_logs_response.status_code, 200)
        self.assertIn(
            "logs.customer@example.com",
            [item["userEmail"] for item in admin_logs_response.get_json()["items"]],
        )

        staff_client = _secondary_client(self.client)
        create_staff_test_session(staff_client)
        self.assertEqual(staff_client.get("/api/admin/access-logs").status_code, 403)

    def test_session_listing_and_revocation(self) -> None:
        session = create_test_session(self.client)
        second_client = _secondary_client(self.client)
        second_login_response = second_client.post(
            "/api/login",
            json={"email": session.email, "password": session.password},
        )
        self.assertEqual(second_login_response.status_code, 200)

        sessions_response = self.client.get("/api/me/sessions")
        self.assertEqual(sessions_response.status_code, 200)
        sessions = sessions_response.get_json()["items"]
        self.assertEqual(len(sessions), 2)

        current = next(item for item in sessions if item["isCurrent"])
        other = next(item for item in sessions if not item["isCurrent"])
        current_revoke_response = self.client.delete(
            f"/api/me/sessions/{current['id']}"
        )
        self.assertEqual(current_revoke_response.status_code, 400)
        self.assertEqual(
            current_revoke_response.get_json()["code"],
            "CURRENT_SESSION_REVOCATION_NOT_ALLOWED",
        )

        revoke_response = self.client.delete(f"/api/me/sessions/{other['id']}")
        self.assertEqual(revoke_response.status_code, 200)
        self.assertEqual(revoke_response.get_json(), {"ok": True})
        self.assertEqual(second_client.get("/api/me").status_code, 401)

        audit_response = self.client.get("/api/admin/audit/events?entityType=user")
        self.assertEqual(audit_response.status_code, 403)
        create_superadmin_test_session(self.client, email="audit.admin@example.com")
        audit_response = self.client.get("/api/admin/audit/events?entityType=user")
        self.assertEqual(audit_response.status_code, 200)
        self.assertIn(
            "session_revoked",
            [item["action"] for item in audit_response.get_json()["items"]],
        )

    def test_email_mfa_login_flow_and_trusted_browser(self) -> None:
        session = create_test_session(
            self.client,
            email="mfa.customer@example.com",
            password="MfaPass99$",
        )
        settings_response = self.client.patch(
            "/api/me/mfa",
            json={"emailEnabled": True},
        )
        self.assertEqual(settings_response.status_code, 200)
        self.assertTrue(settings_response.get_json()["emailEnabled"])
        self.client.post("/api/logout")

        login_response = self.client.post(
            "/api/login",
            json={"email": session.email, "password": session.password},
        )
        self.assertEqual(login_response.status_code, 202)
        self.assertIn(".email-token", login_response.get_json()["download"]["html"])
        self.assertNotIn("styles.css", login_response.get_json()["download"]["html"])
        challenge = login_response.get_json()["mfaChallenge"]

        invalid_response = self.client.post(
            "/api/login/mfa/verify",
            json={
                "challengeId": challenge["challengeId"],
                "code": "000000",
            },
        )
        self.assertEqual(invalid_response.status_code, 400)

        verify_response = self.client.post(
            "/api/login/mfa/verify",
            json={
                "challengeId": challenge["challengeId"],
                "code": _mfa_code(login_response),
                "trustBrowser": True,
            },
        )
        self.assertEqual(verify_response.status_code, 200)
        self.assertEqual(verify_response.get_json()["user"]["email"], session.email)

        self.client.post("/api/logout")
        trusted_login_response = self.client.post(
            "/api/login",
            json={"email": session.email, "password": session.password},
        )
        self.assertEqual(trusted_login_response.status_code, 200)
        self.assertEqual(
            trusted_login_response.get_json()["user"]["email"],
            session.email,
        )


if __name__ == "__main__":
    unittest.main()
