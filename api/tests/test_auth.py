import re
import unittest

from src.auth.security import hash_password
from src.common.app import extension_from
from src.users.models import (
    USER_STATUS_ACTIVE,
    USER_STATUS_UNVERIFIED,
    USER_TYPE_CUSTOMER,
    USER_TYPE_STAFF,
)
from src.users.repository import UserRepository
from werkzeug.test import TestResponse

from tests.helpers.app_case import AppTestCase
from tests.helpers.session_factory import (
    create_staff_test_session,
    create_superadmin_test_session,
    create_test_session,
)


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

    def test_register_returns_verification_download_and_keeps_session_guest(
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
        self.assertTrue(payload["download"]["filename"].endswith(".html"))
        self.assertIn("<style>", payload["download"]["html"])
        self.assertIn(".action-link", payload["download"]["html"])
        self.assertNotIn("styles.css", payload["download"]["html"])
        self.assertEqual(self.client.get("/api/me").status_code, 401)

    def test_register_rejects_unsafe_passwords(self) -> None:
        cases = [
            (
                "personal info",
                _register_payload(password="AlexCustomer7"),
                "PASSWORD_HAS_PERSONAL_INFO",
            ),
            (
                "common pattern",
                _register_payload(password="abcd1234!"),
                "PASSWORD_HAS_COMMON_PATTERN",
            ),
        ]

        for label, payload, code in cases:
            with self.subTest(label=label):
                response = self.client.post("/api/register", json=payload)
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.get_json()["code"], code)

    def test_register_duplicate_verified_email_returns_conflict(self) -> None:
        first = self.client.post("/api/register", json=_register_payload())
        verify_response = self.client.post(
            "/api/verify-email",
            json={"token": _download_token(first)},
        )
        second = self.client.post("/api/register", json=_register_payload())

        self.assertEqual(first.status_code, 202)
        self.assertEqual(verify_response.status_code, 200)
        self.assertEqual(second.status_code, 409)
        self.assertEqual(
            second.get_json(),
            {"code": "EMAIL_EXISTS", "error": "email already exists"},
        )

    def test_login_sets_session_cookie(self) -> None:
        session = create_test_session(self.client)
        self.client.post("/api/logout")

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
        self.assertEqual(self.client.get("/api/me").status_code, 200)

    def test_staff_login_respects_user_type(self) -> None:
        customer_session = create_test_session(self.client)
        self.client.post("/api/logout")

        customer_response = self.client.post(
            "/api/login",
            json={
                "email": customer_session.email,
                "password": customer_session.password,
                "userType": USER_TYPE_STAFF,
            },
        )
        self.assertEqual(customer_response.status_code, 403)
        self.assertEqual(
            customer_response.get_json(),
            {
                "code": "STAFF_ACCOUNT_REQUIRED",
                "error": "staff account is required",
            },
        )

        staff_session = create_staff_test_session(self.client)
        self.client.post("/api/logout")
        staff_response = self.client.post(
            "/api/login",
            json={
                "email": staff_session.email,
                "password": staff_session.password,
                "userType": USER_TYPE_STAFF,
            },
        )

        self.assertEqual(staff_response.status_code, 200)
        self.assertEqual(staff_response.get_json()["user"]["userType"], USER_TYPE_STAFF)

    def test_customer_login_rejects_staff_accounts(self) -> None:
        staff_session = create_staff_test_session(self.client)
        self.client.post("/api/logout")

        response = self.client.post(
            "/api/login",
            json={
                "email": staff_session.email,
                "password": staff_session.password,
                "userType": USER_TYPE_CUSTOMER,
            },
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.get_json(),
            {
                "code": "CUSTOMER_ACCOUNT_REQUIRED",
                "error": "customer account is required",
            },
        )

    def test_superadmin_can_update_managed_user_and_status(self) -> None:
        superadmin_session = create_superadmin_test_session(self.client)
        repository = extension_from(
            self.client.application,
            "user_repository",
            UserRepository,
        )
        managed_user = repository.insert_user(
            email="managed.staff@example.com",
            password_hash=hash_password("Harbour84!"),
            first_name="Jordan",
            last_name="Lee",
            user_type=USER_TYPE_STAFF,
            status=USER_STATUS_ACTIVE,
            staff_id="STF-010",
            designation="Sales",
            permission="admin",
        )

        update_response = self.client.patch(
            f"/api/admin/users/{managed_user.id}",
            json={
                "email": "jordan.lee@example.com",
                "firstName": "Jordan",
                "lastName": "Miles",
                "staffId": "STF-011",
                "designation": "Operations",
                "permission": "superadmin",
            },
        )

        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.get_json()["user"]["permission"], "superadmin")
        self.assertEqual(update_response.get_json()["user"]["lastName"], "Miles")

        status_response = self.client.patch(
            f"/api/admin/users/{managed_user.id}/status",
            json={"status": "disabled"},
        )

        self.assertEqual(status_response.status_code, 403)
        self.assertEqual(
            status_response.get_json(),
            {
                "code": "USER_MANAGEMENT_NOT_ALLOWED",
                "error": "you cannot manage that user",
            },
        )
        self.assertEqual(superadmin_session.user.permission, "superadmin")

    def test_superadmin_cannot_manage_self_or_peer_superadmin(self) -> None:
        superadmin_session = create_superadmin_test_session(self.client)
        repository = extension_from(
            self.client.application,
            "user_repository",
            UserRepository,
        )
        peer_superadmin = repository.insert_user(
            email="peer.superadmin@example.com",
            password_hash=hash_password("Harbour84!"),
            first_name="Casey",
            last_name="Rowe",
            user_type=USER_TYPE_STAFF,
            status=USER_STATUS_ACTIVE,
            designation="Super Admin",
            permission="superadmin",
        )

        self_response = self.client.patch(
            f"/api/admin/users/{superadmin_session.user.id}/status",
            json={"status": "disabled"},
        )
        peer_response = self.client.patch(
            f"/api/admin/users/{peer_superadmin.id}/status",
            json={"status": "disabled"},
        )

        self.assertEqual(self_response.status_code, 403)
        self.assertEqual(peer_response.status_code, 403)
        self.assertEqual(
            self_response.get_json()["code"], "USER_MANAGEMENT_NOT_ALLOWED"
        )
        self.assertEqual(
            peer_response.get_json()["code"], "USER_MANAGEMENT_NOT_ALLOWED"
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
        self.assertEqual(self.client.get("/api/me").status_code, 200)

    def test_forgot_password_download_resets_customer_password(self) -> None:
        session = create_test_session(self.client)

        response = self.client.post(
            "/api/forgot-password",
            json={"email": session.email},
        )

        self.assertEqual(response.status_code, 200)
        reset_response = self.client.post(
            "/api/reset-password",
            json={"token": _download_token(response), "password": "HarbourReset9$"},
        )
        self.assertEqual(reset_response.status_code, 200)

        self.client.post("/api/logout")
        login_response = self.client.post(
            "/api/login",
            json={"email": session.email, "password": "HarbourReset9$"},
        )
        self.assertEqual(login_response.status_code, 200)

    def test_forgot_password_preserves_staff_flow(self) -> None:
        session = create_staff_test_session(self.client)

        response = self.client.post(
            "/api/forgot-password",
            json={
                "email": session.email,
                "userType": USER_TYPE_STAFF,
            },
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

    def test_update_me_updates_customer_profile(self) -> None:
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

    def test_update_me_saves_profile_image_without_current_password(self) -> None:
        session = create_test_session(self.client)
        image_data_url = "data:image/png;base64,aW90YmF5"

        response = self.client.patch(
            "/api/me",
            json={
                "email": session.email,
                "firstName": "Alex",
                "lastName": "Nguyen",
                "profileImageUrl": image_data_url,
            },
        )

        self.assertEqual(response.status_code, 200)
        image_url = response.get_json()["user"]["profileImageUrl"]
        self.assertTrue(image_url.startswith("/api/media/"))
        image_response = self.client.get(image_url)
        self.assertEqual(image_response.status_code, 200)
        self.assertEqual(image_response.content_type, "image/png")
        self.assertEqual(image_response.data, b"iotbay")

        repository = extension_from(
            self.client.application,
            "user_repository",
            UserRepository,
        )
        saved_user = repository.select_user_by_id(user_id=session.user.user_id)
        self.assertIsNotNone(saved_user)
        assert saved_user is not None
        self.assertEqual(saved_user.profile_image_url, image_url)

    def test_update_me_preserves_superadmin_permission(self) -> None:
        session = create_superadmin_test_session(self.client)

        response = self.client.patch(
            "/api/me",
            json={
                "email": session.email,
                "firstName": "Sam",
                "lastName": "Rivera",
                "staffId": "STF-900",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["user"]["permission"], "superadmin")
        self.assertEqual(self.client.get("/api/admin/users").status_code, 200)

    def test_update_me_email_change_requires_current_password_and_reverification(
        self,
    ) -> None:
        session = create_test_session(self.client)

        missing_password_response = self.client.patch(
            "/api/me",
            json={
                "email": "alex.verified@example.com",
                "firstName": "Alex",
                "lastName": "Nguyen",
            },
        )
        self.assertEqual(missing_password_response.status_code, 400)
        self.assertEqual(
            missing_password_response.get_json(),
            {
                "code": "CURRENT_PASSWORD_REQUIRED",
                "error": "current password is required to save changes",
            },
        )

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
        self.assertEqual(
            response.get_json()["verification"]["email"],
            "alex.verified@example.com",
        )
        self.assertEqual(self.client.get("/api/me").status_code, 401)

        verify_response = self.client.post(
            "/api/verify-email",
            json={"token": _download_token(response)},
        )
        self.assertEqual(verify_response.status_code, 200)
        self.assertEqual(
            verify_response.get_json()["user"]["email"],
            "alex.verified@example.com",
        )

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
        self.assertEqual(
            response.get_json()["verification"]["email"],
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
            user_type="customer",
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

    def test_superadmin_can_list_registered_users(self) -> None:
        create_superadmin_test_session(self.client)
        repository = extension_from(
            self.client.application,
            "user_repository",
            UserRepository,
        )
        repository.insert_user(
            email="customer.list@example.com",
            password_hash=hash_password("CustomerList9$"),
            first_name="List",
            last_name="Customer",
            user_type=USER_TYPE_CUSTOMER,
            status=USER_STATUS_ACTIVE,
        )

        response = self.client.get("/api/admin/users")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIsNotNone(payload)
        emails = {item["email"] for item in payload["items"]}
        self.assertIn("sam.superadmin@example.com", emails)
        self.assertIn("customer.list@example.com", emails)

    def test_admin_cannot_list_registered_users(self) -> None:
        create_staff_test_session(self.client)

        response = self.client.get("/api/admin/users")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.get_json(),
            {
                "code": "STAFF_PERMISSION_REQUIRED",
                "error": "staff permission is required",
            },
        )

    def test_superadmin_can_invite_staff(self) -> None:
        create_superadmin_test_session(self.client)

        response = self.client.post(
            "/api/admin/staff-invitations",
            json={
                "designation": "Store manager",
                "email": "new.staff@example.com",
                "permission": "admin",
                "staffId": "STF-001",
            },
        )

        self.assertEqual(response.status_code, 202)
        payload = response.get_json()
        self.assertIsNotNone(payload)
        self.assertEqual(payload["verification"]["email"], "new.staff@example.com")
        self.assertIn("staff-register", payload["download"]["html"])

    def test_admin_cannot_invite_staff(self) -> None:
        create_staff_test_session(self.client)

        response = self.client.post(
            "/api/admin/staff-invitations",
            json={
                "designation": "Store manager",
                "email": "new.staff@example.com",
                "permission": "admin",
                "staffId": "STF-001",
            },
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.get_json(),
            {
                "code": "STAFF_PERMISSION_REQUIRED",
                "error": "staff permission is required",
            },
        )

    def test_staff_can_complete_invitation(self) -> None:
        create_superadmin_test_session(self.client)
        invite_response = self.client.post(
            "/api/admin/staff-invitations",
            json={
                "designation": "Store manager",
                "email": "new.staff@example.com",
                "permission": "admin",
                "staffId": "STF-001",
            },
        )
        token = _download_token(invite_response)
        self.client.post("/api/logout")

        response = self.client.post(
            "/api/staff-register",
            json={
                "firstName": "New",
                "lastName": "Staff",
                "password": "HarbourDesk9$",
                "token": token,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIsNotNone(payload)
        self.assertEqual(payload["user"]["email"], "new.staff@example.com")
        self.assertEqual(payload["user"]["status"], "active")
        self.assertEqual(payload["user"]["userType"], USER_TYPE_STAFF)
        self.assertEqual(payload["user"]["staffId"], "STF-001")

        me_response = self.client.get("/api/me")
        self.assertEqual(me_response.status_code, 200)

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
        self.assertEqual(self.client.get("/api/me").status_code, 401)


if __name__ == "__main__":
    unittest.main()
