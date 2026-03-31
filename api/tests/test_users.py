import tempfile
import unittest
from pathlib import Path

from src.users.models import (
    USER_STATUS_ACTIVE,
    USER_STATUS_UNVERIFIED,
    USER_TYPE_CUSTOMER,
    USER_TYPE_STAFF,
)
from src.users.repository import UserRepository
from tests.context.app import create_test_client


class UserRepositoryTestCase(unittest.TestCase):
    def setUp(self) -> None:
        super().setUp()
        temp_dir = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.client, self.database_path = create_test_client(temp_dir)
        self.repository = UserRepository(self.database_path)

    def test_create_address_and_load_by_id(self) -> None:
        address = self.repository.create_address(
            address_line_one="12 Harbour Road",
            address_line_two="Unit 5",
            suburb="Sydney",
            state="NSW",
            postcode="2000",
            country="Australia",
        )

        loaded = self.repository.find_address_by_id(address_id=address.address_id)

        self.assertEqual(loaded, address)
        if loaded is None:
            self.fail("expected address to be loaded")
        self.assertEqual(loaded.id, address.id)

    def test_create_customer_user_with_address(self) -> None:
        address = self.repository.create_address(
            address_line_one="55 Market Street",
            address_line_two="",
            suburb="Melbourne",
            state="VIC",
            postcode="3000",
            country="Australia",
        )

        user = self.repository.create_user(
            email="alex.customer@example.com",
            password_hash="hashed-password",
            first_name="Alex",
            last_name="Nguyen",
            user_type=USER_TYPE_CUSTOMER,
            status=USER_STATUS_UNVERIFIED,
            address_id=address.address_id,
        )

        loaded = self.repository.find_user_by_email(email="alex.customer@example.com")

        self.assertIsNotNone(loaded)
        if loaded is None:
            self.fail("expected user to be loaded by email")
        self.assertEqual(loaded, user)
        self.assertEqual(loaded.address_id, address.address_id)
        self.assertEqual(loaded.user_type, USER_TYPE_CUSTOMER)
        self.assertEqual(loaded.status, USER_STATUS_UNVERIFIED)
        self.assertEqual(loaded.id, user.id)

    def test_create_staff_user_without_address(self) -> None:
        user = self.repository.create_user(
            email="taylor.staff@example.com",
            password_hash="hashed-password",
            first_name="Taylor",
            last_name="Reid",
            user_type=USER_TYPE_STAFF,
            status=USER_STATUS_ACTIVE,
        )

        loaded = self.repository.find_user_by_id(user_id=user.user_id)

        self.assertIsNotNone(loaded)
        if loaded is None:
            self.fail("expected user to be loaded by id")
        self.assertEqual(loaded, user)
        self.assertIsNone(loaded.address_id)
        self.assertEqual(loaded.user_type, USER_TYPE_STAFF)
        self.assertEqual(loaded.status, USER_STATUS_ACTIVE)


if __name__ == "__main__":
    unittest.main()
