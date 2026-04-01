import tempfile
import unittest
from pathlib import Path

from tests.helpers.test_app import create_test_app_client
from tests.helpers.test_session import create_test_session


def _register_payload(
    *,
    email: str = "alex.customer@example.com",
    password: str = "CedarGrove42",
    first_name: str = "Alex",
    last_name: str = "Nguyen",
) -> dict[str, str]:
    return {
        "email": email,
        "password": password,
        "firstName": first_name,
        "lastName": last_name,
    }


class AuthRouteTestCase(unittest.TestCase):
    def setUp(self) -> None:
        super().setUp()
        temp_dir = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.client, _ = create_test_app_client(temp_dir)

    def test_register_creates_customer_and_starts_session(self) -> None:
        response = self.client.post("/api/register", json=_register_payload())

        self.assertEqual(response.status_code, 201)
        payload = response.get_json()
        self.assertIsNotNone(payload)
        self.assertEqual(payload["user"]["email"], "alex.customer@example.com")
        self.assertEqual(payload["user"]["userType"], "customer")
        self.assertEqual(payload["user"]["status"], "active")

        me_response = self.client.get("/api/me")
        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(
            me_response.get_json()["user"]["email"],
            "alex.customer@example.com",
        )

    def test_register_duplicate_email_returns_conflict(self) -> None:
        payload = _register_payload()

        first = self.client.post("/api/register", json=payload)
        second = self.client.post("/api/register", json=payload)

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 409)
        self.assertEqual(
            second.get_json(),
            {"code": "EMAIL_EXISTS", "error": "email already exists"},
        )

    def test_login_sets_session_cookie(self) -> None:
        session = create_test_session(self.client)
        logout_response = self.client.post("/api/logout")
        self.assertEqual(logout_response.status_code, 204)

        response = self.client.post(
            "/api/login",
            json={
                "email": session.email,
                "password": session.password,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json()["user"]["email"],
            "alex.customer@example.com",
        )

        me_response = self.client.get("/api/me")
        self.assertEqual(me_response.status_code, 200)

    def test_login_invalid_password_returns_unauthorized(self) -> None:
        session = create_test_session(self.client)
        logout_response = self.client.post("/api/logout")
        self.assertEqual(logout_response.status_code, 204)

        response = self.client.post(
            "/api/login",
            json={
                "email": session.email,
                "password": "wrong-password",
            },
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.get_json(),
            {
                "code": "INVALID_CREDENTIALS",
                "error": "email or password is incorrect",
            },
        )

    def test_register_rejects_password_with_personal_info(self) -> None:
        response = self.client.post(
            "/api/register",
            json=_register_payload(password="AlexCustomer7"),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {
                "code": "PASSWORD_HAS_PERSONAL_INFO",
                "error": "password must not contain personal information",
            },
        )

    def test_register_rejects_password_with_dotted_email_term(self) -> None:
        response = self.client.post(
            "/api/register",
            json=_register_payload(
                email="alex.nguyen@example.com",
                password="Nguyen8$Secure",
            ),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {
                "code": "PASSWORD_HAS_PERSONAL_INFO",
                "error": "password must not contain personal information",
            },
        )

    def test_register_rejects_password_with_hyphenated_name_term(self) -> None:
        response = self.client.post(
            "/api/register",
            json=_register_payload(
                first_name="Mary-Jane",
                password="Jane8$Secure",
            ),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {
                "code": "PASSWORD_HAS_PERSONAL_INFO",
                "error": "password must not contain personal information",
            },
        )

    def test_register_rejects_password_with_common_pattern(self) -> None:
        response = self.client.post(
            "/api/register",
            json=_register_payload(password="abcd1234!"),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {
                "code": "PASSWORD_HAS_COMMON_PATTERN",
                "error": "password contains a common pattern",
            },
        )

    def test_me_requires_authentication(self) -> None:
        response = self.client.get("/api/me")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.get_json(),
            {"error": "authentication is required"},
        )

    def test_logout_clears_session(self) -> None:
        create_test_session(self.client)

        logout_response = self.client.post("/api/logout")
        self.assertEqual(logout_response.status_code, 204)

        me_response = self.client.get("/api/me")
        self.assertEqual(me_response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
