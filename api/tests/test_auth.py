import re
import unittest
from unittest.mock import patch

from src.auth.security import hash_password
from src.common.app import extension_from
from src.users.models import (
    USER_STATUS_ACTIVE,
    USER_STATUS_UNVERIFIED,
    USER_TYPE_CUSTOMER,
    USER_TYPE_STAFF,
)
from src.users.repository import UserRepository
from tests.helpers.test_case import AppTestCase
from tests.helpers.test_session import create_staff_test_session, create_test_session
from werkzeug.test import TestResponse


def _register_payload(
    *,
    email: str = "alex.customer@example.com",
    password: str = "CedarGrove42",
    first_name: str = "Alex",
    last_name: str = "Nguyen",
) -> dict[str, str]:
    return {
        "addressLineOne": "12 Harbour Road",
        "country": "Australia",
        "email": email,
        "password": password,
        "firstName": first_name,
        "lastName": last_name,
        "postcode": "2000",
        "state": "NSW",
        "suburb": "Sydney",
    }


def _download_token(response: TestResponse) -> str:
    payload = response.get_json()
    assert payload is not None
    token_match = re.search(r"token=([^\"&]+)", payload["download"]["html"])
    assert token_match is not None
    return token_match.group(1)


def _assert_user_payload(
    payload: dict[str, object],
    *,
    email: str,
    first_name: str,
    last_name: str,
    status: str,
    user_type: str,
) -> None:
    assert payload["email"] == email
    assert payload["firstName"] == first_name
    assert payload["lastName"] == last_name
    assert payload["status"] == status
    assert payload["userType"] == user_type
    assert isinstance(payload["id"], str)


class AuthRouteTestCase(AppTestCase):
    def environment_overrides(self) -> dict[str, str]:
        return {
            "IOTBAY_SMTP_HOST": "",
            "IOTBAY_SMTP_PASSWORD": "",
            "IOTBAY_SMTP_USERNAME": "",
        }

    def test_register_creates_unverified_customer_and_returns_verification_download(
        self,
    ) -> None:
        response = self.client.post("/api/register", json=_register_payload())

        self.assertEqual(response.status_code, 202)
        payload = response.get_json()
        self.assertIsNotNone(payload)
        self.assertEqual(
            payload["verification"]["email"],
            "alex.customer@example.com",
        )
        self.assertIn("download", payload)
        self.assertTrue(payload["download"]["filename"].endswith(".html"))

        me_response = self.client.get("/api/me")
        self.assertEqual(me_response.status_code, 401)

    def test_register_duplicate_email_returns_conflict(self) -> None:
        payload = _register_payload()

        first = self.client.post("/api/register", json=payload)
        verify_response = self.client.post(
            "/api/verify-email",
            json={"token": _download_token(first)},
        )
        second = self.client.post("/api/register", json=payload)

        self.assertEqual(first.status_code, 202)
        self.assertEqual(verify_response.status_code, 200)
        self.assertEqual(second.status_code, 409)
        self.assertEqual(
            second.get_json(),
            {"code": "EMAIL_EXISTS", "error": "email already exists"},
        )

    def test_register_existing_unverified_email_replaces_verification_link(
        self,
    ) -> None:
        first = self.client.post("/api/register", json=_register_payload())
        second = self.client.post("/api/register", json=_register_payload())

        self.assertEqual(first.status_code, 202)
        self.assertEqual(second.status_code, 202)

        verify_response = self.client.post(
            "/api/verify-email",
            json={"token": _download_token(second)},
        )
        self.assertEqual(verify_response.status_code, 200)

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

    def test_staff_login_rejects_customer_user(self) -> None:
        session = create_test_session(self.client)
        self.client.post("/api/logout")

        response = self.client.post(
            "/api/login",
            json={
                "email": session.email,
                "password": session.password,
                "userType": USER_TYPE_STAFF,
            },
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.get_json(),
            {
                "code": "STAFF_ACCOUNT_REQUIRED",
                "error": "staff account is required",
            },
        )

    def test_staff_login_accepts_staff_user(self) -> None:
        session = create_staff_test_session(self.client)
        self.client.post("/api/logout")

        response = self.client.post(
            "/api/login",
            json={
                "email": session.email,
                "password": session.password,
                "userType": USER_TYPE_STAFF,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIsNotNone(payload)
        self.assertEqual(payload["user"]["userType"], USER_TYPE_STAFF)

    def test_login_rejects_unverified_user(self) -> None:
        register_response = self.client.post("/api/register", json=_register_payload())

        self.assertEqual(register_response.status_code, 202)

        response = self.client.post(
            "/api/login",
            json={
                "email": "alex.customer@example.com",
                "password": "CedarGrove42",
            },
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.get_json(),
            {
                "code": "EMAIL_NOT_VERIFIED",
                "error": "email verification is required",
            },
        )

    def test_verify_email_activates_user_and_starts_session(self) -> None:
        register_response = self.client.post("/api/register", json=_register_payload())

        response = self.client.post(
            "/api/verify-email",
            json={"token": _download_token(register_response)},
        )

        self.assertEqual(response.status_code, 200)
        _assert_user_payload(
            response.get_json()["user"],
            email="alex.customer@example.com",
            first_name="Alex",
            last_name="Nguyen",
            status="active",
            user_type="customer",
        )

        me_response = self.client.get("/api/me")
        self.assertEqual(me_response.status_code, 200)

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

    def test_register_rejects_numeric_sequence_password(self) -> None:
        response = self.client.post(
            "/api/register",
            json=_register_payload(password="12345678"),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {
                "code": "PASSWORD_HAS_COMMON_PATTERN",
                "error": "password contains a common pattern",
            },
        )

    def test_register_rejects_symbol_keyboard_sequence_password(self) -> None:
        response = self.client.post(
            "/api/register",
            json=_register_payload(password="~!@#Secure9"),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {
                "code": "PASSWORD_HAS_COMMON_PATTERN",
                "error": "password contains a common pattern",
            },
        )

    def test_register_does_not_treat_email_domain_as_personal_info(self) -> None:
        response = self.client.post(
            "/api/register",
            json=_register_payload(
                email="alex@harbour.com",
                password="Harbour9$Wave",
            ),
        )

        self.assertEqual(response.status_code, 202)

    def test_register_normalizes_email_to_lowercase(self) -> None:
        response = self.client.post(
            "/api/register",
            json=_register_payload(email="Alex.Customer@Example.COM"),
        )

        self.assertEqual(response.status_code, 202)
        verify_response = self.client.post(
            "/api/verify-email",
            json={"token": _download_token(response)},
        )
        self.assertEqual(verify_response.status_code, 200)
        self.assertEqual(
            verify_response.get_json()["user"]["email"],
            "alex.customer@example.com",
        )

    def test_register_rejects_overlong_first_name(self) -> None:
        response = self.client.post(
            "/api/register",
            json=_register_payload(first_name="A" * 101),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {
                "error": "firstName must be 100 characters or fewer",
            },
        )

    def test_register_allows_missing_address(self) -> None:
        response = self.client.post(
            "/api/register",
            json={
                "email": "alex.customer@example.com",
                "password": "CedarGrove42",
                "firstName": "Alex",
                "lastName": "Nguyen",
            },
        )

        self.assertEqual(response.status_code, 202)

    def test_register_rejects_unicode_email(self) -> None:
        response = self.client.post(
            "/api/register",
            json=_register_payload(email="alex😀@example.com"),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {"error": "email must use ASCII characters only"},
        )

    def test_register_rejects_unicode_name(self) -> None:
        response = self.client.post(
            "/api/register",
            json=_register_payload(first_name="Alex😀"),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {"error": "firstName must use ASCII characters only"},
        )

    def test_register_rejects_unicode_password(self) -> None:
        response = self.client.post(
            "/api/register",
            json=_register_payload(password="Cedar😀42"),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {"error": "password must use ASCII characters only"},
        )

    def test_register_saves_optional_customer_profile_fields(self) -> None:
        response = self.client.post(
            "/api/register",
            json={
                **_register_payload(),
                "addressLineTwo": "Unit 3",
                "phoneCountry": "AU",
                "phoneNumber": "0412 345 678",
            },
        )

        self.assertEqual(response.status_code, 202)
        verify_response = self.client.post(
            "/api/verify-email",
            json={"token": _download_token(response)},
        )
        payload = verify_response.get_json()
        self.assertIsNotNone(payload)
        self.assertEqual(payload["user"]["phoneNumber"], "+61412345678")
        self.assertEqual(
            payload["user"]["addressLabel"],
            "12 Harbour Road, Sydney NSW 2000, Australia",
        )
        self.assertEqual(payload["user"]["addressLineOne"], "12 Harbour Road")
        self.assertEqual(payload["user"]["addressLineTwo"], "Unit 3")

    def test_register_accepts_phone_without_leading_zero(self) -> None:
        response = self.client.post(
            "/api/register",
            json={
                **_register_payload(),
                "phoneCountry": "AU",
                "phoneNumber": "412345678",
            },
        )

        self.assertEqual(response.status_code, 202)
        verify_response = self.client.post(
            "/api/verify-email",
            json={"token": _download_token(response)},
        )
        payload = verify_response.get_json()
        self.assertIsNotNone(payload)
        self.assertEqual(payload["user"]["phoneNumber"], "+61412345678")

    def test_register_accepts_phone_with_country_code_without_plus(self) -> None:
        response = self.client.post(
            "/api/register",
            json={
                **_register_payload(),
                "phoneCountry": "AU",
                "phoneNumber": "61412345678",
            },
        )

        self.assertEqual(response.status_code, 202)
        verify_response = self.client.post(
            "/api/verify-email",
            json={"token": _download_token(response)},
        )
        payload = verify_response.get_json()
        self.assertIsNotNone(payload)
        self.assertEqual(payload["user"]["phoneNumber"], "+61412345678")

    def test_forgot_password_returns_download_when_smtp_is_not_configured(self) -> None:
        session = create_test_session(self.client)

        with patch.dict(
            "os.environ",
            {
                "IOTBAY_SMTP_HOST": "",
                "IOTBAY_SMTP_PASSWORD": "",
                "IOTBAY_SMTP_PORT": "587",
                "IOTBAY_SMTP_USE_TLS": "1",
                "IOTBAY_SMTP_USERNAME": "",
            },
        ):
            response = self.client.post(
                "/api/forgot-password",
                json={"email": session.email},
            )

        self.assertEqual(response.status_code, 200)
        token = _download_token(response)

        reset_response = self.client.post(
            "/api/reset-password",
            json={"token": token, "password": "HarbourReset9$"},
        )
        self.assertEqual(reset_response.status_code, 200)
        self.assertEqual(reset_response.get_json(), {"ok": True})

        login_response = self.client.post(
            "/api/login",
            json={"email": session.email, "password": "HarbourReset9$"},
        )
        self.assertEqual(login_response.status_code, 200)

    def test_forgot_password_returns_download_when_smtp_fails(self) -> None:
        session = create_test_session(self.client)

        with patch.dict(
            "os.environ",
            {
                "IOTBAY_SENDER": "noreply@example.com",
                "IOTBAY_SMTP_HOST": "127.0.0.1",
                "IOTBAY_SMTP_PASSWORD": "",
                "IOTBAY_SMTP_PORT": "1",
                "IOTBAY_SMTP_USE_TLS": "0",
                "IOTBAY_SMTP_USERNAME": "",
            },
        ):
            response = self.client.post(
                "/api/forgot-password",
                json={"email": session.email},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIsNotNone(payload)
        self.assertIn("download", payload)
        self.assertTrue(payload["download"]["filename"].endswith(".html"))
        self.assertIn("Reset your IOTBay password", payload["download"]["html"])

    def test_staff_forgot_password_returns_staff_reset_link(self) -> None:
        session = create_staff_test_session(self.client)

        with patch.dict(
            "os.environ",
            {
                "IOTBAY_SMTP_HOST": "",
                "IOTBAY_SMTP_PASSWORD": "",
                "IOTBAY_SMTP_PORT": "587",
                "IOTBAY_SMTP_USE_TLS": "1",
                "IOTBAY_SMTP_USERNAME": "",
            },
        ):
            response = self.client.post(
                "/api/forgot-password",
                json={"email": session.email, "userType": USER_TYPE_STAFF},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIsNotNone(payload)
        self.assertIn("userType=staff", payload["download"]["html"])

        reset_response = self.client.post(
            "/api/reset-password",
            json={"token": _download_token(response), "password": "HarbourReset9$"},
        )
        self.assertEqual(reset_response.status_code, 200)

        self.client.post("/api/logout")
        login_response = self.client.post(
            "/api/login",
            json={
                "email": session.email,
                "password": "HarbourReset9$",
                "userType": USER_TYPE_STAFF,
            },
        )
        self.assertEqual(login_response.status_code, 200)

    def test_verify_email_invalid_token_returns_bad_request(self) -> None:
        response = self.client.post(
            "/api/verify-email",
            json={"token": "bad-token"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {
                "code": "INVALID_EMAIL_VERIFICATION_TOKEN",
                "error": "verification link is invalid or expired",
            },
        )

    def test_update_me_updates_profile(self) -> None:
        session = create_test_session(self.client)

        response = self.client.patch(
            "/api/me",
            json={
                "currentPassword": session.password,
                "email": session.email,
                "firstName": "Alexa",
                "lastName": "Nguyen",
                "phoneCountry": "AU",
                "phoneNumber": "0412 345 678",
            },
        )

        self.assertEqual(response.status_code, 200)
        _assert_user_payload(
            response.get_json()["user"],
            email=session.email,
            first_name="Alexa",
            last_name="Nguyen",
            status="active",
            user_type="customer",
        )
        self.assertEqual(response.get_json()["user"]["phoneNumber"], "+61412345678")

    def test_register_rejects_invalid_phone_number(self) -> None:
        response = self.client.post(
            "/api/register",
            json={
                **_register_payload(),
                "phoneCountry": "AU",
                "phoneNumber": "123",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {
                "code": "PHONE_NUMBER_INVALID",
                "error": "phone number is invalid",
            },
        )

    def test_update_me_updates_staff_profile(self) -> None:
        session = create_staff_test_session(self.client)

        response = self.client.patch(
            "/api/me",
            json={
                "currentPassword": session.password,
                "designation": "Operations Lead",
                "email": "taylor.staff@example.com",
                "firstName": "Taylor",
                "lastName": "Morgan",
                "permission": "superadmin",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIsNotNone(payload)
        self.assertEqual(payload["user"]["designation"], "Operations Lead")
        self.assertEqual(payload["user"]["permission"], "superadmin")

    def test_update_me_email_change_requires_current_password(self) -> None:
        create_test_session(self.client)

        response = self.client.patch(
            "/api/me",
            json={
                "email": "alex.verified@example.com",
                "firstName": "Alex",
                "lastName": "Nguyen",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {
                "code": "CURRENT_PASSWORD_REQUIRED",
                "error": "current password is required to save changes",
            },
        )

    def test_update_me_name_change_requires_current_password(self) -> None:
        session = create_test_session(self.client)

        response = self.client.patch(
            "/api/me",
            json={
                "email": session.email,
                "firstName": "Alexa",
                "lastName": "Nguyen",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {
                "code": "CURRENT_PASSWORD_REQUIRED",
                "error": "current password is required to save changes",
            },
        )

    def test_update_me_email_change_rejects_incorrect_current_password(self) -> None:
        create_test_session(self.client)

        response = self.client.patch(
            "/api/me",
            json={
                "currentPassword": "wrong-password",
                "email": "alex.verified@example.com",
                "firstName": "Alex",
                "lastName": "Nguyen",
            },
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.get_json(),
            {
                "code": "CURRENT_PASSWORD_INCORRECT",
                "error": "current password is incorrect",
            },
        )

    def test_update_me_email_change_requires_reverification(self) -> None:
        session = create_test_session(self.client)

        response = self.client.patch(
            "/api/me",
            json={
                "currentPassword": session.password,
                "email": "alex.verified@example.com",
                "firstName": "Alex",
                "lastName": "Nguyen",
            },
        )

        self.assertEqual(response.status_code, 202)
        payload = response.get_json()
        self.assertIsNotNone(payload)
        self.assertEqual(
            payload["verification"]["email"],
            "alex.verified@example.com",
        )

        me_response = self.client.get("/api/me")
        self.assertEqual(me_response.status_code, 401)

        verify_response = self.client.post(
            "/api/verify-email",
            json={"token": _download_token(response)},
        )
        self.assertEqual(verify_response.status_code, 200)
        self.assertEqual(
            verify_response.get_json()["user"]["email"],
            "alex.verified@example.com",
        )

    def test_resend_verification_returns_download_for_unverified_user(self) -> None:
        response = self.client.post("/api/register", json=_register_payload())

        resend_response = self.client.post(
            "/api/resend-verification",
            json={"email": "alex.customer@example.com"},
        )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(resend_response.status_code, 200)
        payload = resend_response.get_json()
        self.assertIsNotNone(payload)
        self.assertIn("download", payload)

    def test_change_pending_email_reissues_verification(self) -> None:
        self.client.post("/api/register", json=_register_payload())

        response = self.client.post(
            "/api/change-pending-email",
            json={
                "currentEmail": "alex.customer@example.com",
                "email": "alex.updated@example.com",
                "password": "CedarGrove42",
            },
        )

        self.assertEqual(response.status_code, 202)
        payload = response.get_json()
        self.assertIsNotNone(payload)
        self.assertEqual(
            payload["verification"]["email"],
            "alex.updated@example.com",
        )

        verify_response = self.client.post(
            "/api/verify-email",
            json={"token": _download_token(response)},
        )
        self.assertEqual(verify_response.status_code, 200)
        self.assertEqual(
            verify_response.get_json()["user"]["email"],
            "alex.updated@example.com",
        )

    def test_update_me_duplicate_email_returns_conflict(self) -> None:
        session = create_test_session(self.client)
        repository = extension_from(
            self.client.application,
            "user_repository",
            UserRepository,
        )
        repository.insert_user(
            email="other.customer@example.com",
            password_hash=hash_password("OtherSecure9$"),
            first_name="Other",
            last_name="Customer",
            user_type=USER_TYPE_CUSTOMER,
            status=USER_STATUS_ACTIVE,
        )

        response = self.client.patch(
            "/api/me",
            json={
                "currentPassword": session.password,
                "email": "other.customer@example.com",
                "firstName": "Alex",
                "lastName": "Nguyen",
            },
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(
            response.get_json(),
            {"code": "EMAIL_EXISTS", "error": "email already exists"},
        )

    def test_me_requires_authentication(self) -> None:
        response = self.client.get("/api/me")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.get_json(),
            {"error": "authentication is required"},
        )

    def test_register_replaces_existing_unverified_user_details(self) -> None:
        repository = extension_from(
            self.client.application,
            "user_repository",
            UserRepository,
        )
        user = repository.insert_user(
            email="alex.customer@example.com",
            password_hash=hash_password("OldPassword9$"),
            first_name="Old",
            last_name="Name",
            user_type=USER_TYPE_CUSTOMER,
            status=USER_STATUS_UNVERIFIED,
        )

        response = self.client.post(
            "/api/register",
            json=_register_payload(
                first_name="Alex",
                last_name="Nguyen",
                password="CedarGrove42",
            ),
        )

        self.assertEqual(response.status_code, 202)
        updated_user = repository.select_user_by_id(user_id=user.user_id)
        self.assertIsNotNone(updated_user)
        assert updated_user is not None
        self.assertEqual(updated_user.first_name, "Alex")
        self.assertEqual(updated_user.last_name, "Nguyen")

    def test_logout_clears_session(self) -> None:
        create_test_session(self.client)

        logout_response = self.client.post("/api/logout")
        self.assertEqual(logout_response.status_code, 204)

        me_response = self.client.get("/api/me")
        self.assertEqual(me_response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
