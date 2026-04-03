from src.addresses.models import ValidatedAddress
from src.users.models import (
    STAFF_PERMISSION_ADMIN,
    USER_STATUS_ACTIVE,
    USER_STATUS_UNVERIFIED,
    USER_TYPE_CUSTOMER,
    USER_TYPE_STAFF,
)
from src.users.repository import UserRepository
from tests.helpers.test_case import AppTestCase


class UserRepositoryTestCase(AppTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.repository = UserRepository(self.database_path)

    def test_create_customer_user_with_profile_fields(self) -> None:
        address = ValidatedAddress(
            provider="google",
            place_id="google:12-harbour-rd",
            formatted_address="12 Harbour Road, Sydney NSW 2000, Australia",
            address_line_one="12 Harbour Road",
            suburb="Sydney",
            state="NSW",
            postcode="2000",
            country="Australia",
        )
        user = self.repository.insert_user(
            email="alex.customer@example.com",
            password_hash="hashed-password",
            first_name="Alex",
            last_name="Nguyen",
            user_type=USER_TYPE_CUSTOMER,
            status=USER_STATUS_UNVERIFIED,
            phone_number="+61412345678",
            validated_address=address,
            address_line_two="Unit 3",
        )

        loaded = self.repository.select_user_by_email(email="alex.customer@example.com")

        self.assertIsNotNone(loaded)
        if loaded is None:
            self.fail("expected user to be loaded by email")

        self.assertEqual(loaded, user)
        self.assertEqual(loaded.user_type, USER_TYPE_CUSTOMER)
        self.assertEqual(loaded.status, USER_STATUS_UNVERIFIED)
        self.assertEqual(loaded.phone_number, "+61412345678")
        self.assertEqual(
            loaded.address_label,
            "12 Harbour Road, Sydney NSW 2000, Australia",
        )
        self.assertEqual(loaded.address_line_one, "12 Harbour Road")
        self.assertEqual(loaded.address_line_two, "Unit 3")
        self.assertEqual(loaded.id, user.id)

    def test_create_staff_user_defaults_admin_permission(self) -> None:
        user = self.repository.insert_user(
            email="taylor.staff@example.com",
            password_hash="hashed-password",
            first_name="Taylor",
            last_name="Reid",
            user_type=USER_TYPE_STAFF,
            status=USER_STATUS_ACTIVE,
            designation="Store manager",
        )

        loaded = self.repository.select_user_by_id(user_id=user.user_id)

        self.assertIsNotNone(loaded)
        if loaded is None:
            self.fail("expected user to be loaded by id")

        self.assertEqual(loaded, user)
        self.assertEqual(loaded.user_type, USER_TYPE_STAFF)
        self.assertEqual(loaded.status, USER_STATUS_ACTIVE)
        self.assertEqual(loaded.designation, "Store manager")
        self.assertEqual(loaded.permission, STAFF_PERMISSION_ADMIN)
        self.assertTrue(loaded.is_admin)
