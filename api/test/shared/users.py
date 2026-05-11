from dataclasses import dataclass

from src.auth.security import hash_password
from src.users.models import (
    USER_STATUS_ACTIVE,
    USER_TYPE_CUSTOMER,
    USER_TYPE_STAFF,
    User,
)
from src.users.repository import UserRepository

DEFAULT_CUSTOMER_EMAIL = "access.customer@example.com"
DEFAULT_CUSTOMER_PASSWORD = "LogPass99$"
DEFAULT_STAFF_EMAIL = "taylor.staff@example.com"
DEFAULT_STAFF_PASSWORD = "Harbour84!"
DEFAULT_SUPERADMIN_EMAIL = "sam.superadmin@example.com"


@dataclass(slots=True, frozen=True)
class TestUser:
    email: str
    password: str
    user: User


TestCustomer = TestUser


def create_user(
    repository: UserRepository,
    *,
    email: str,
    first_name: str,
    last_name: str,
    password: str,
    status: str = USER_STATUS_ACTIVE,
    user_type: str = USER_TYPE_CUSTOMER,
    designation: str | None = None,
    permission: str | None = None,
    staff_id: str | None = None,
) -> TestUser:
    user = repository.insert_user(
        email=email,
        password_hash=hash_password(password),
        first_name=first_name,
        last_name=last_name,
        user_type=user_type,
        status=status,
        designation=designation,
        permission=permission,
        staff_id=staff_id,
    )
    return TestUser(email=email, password=password, user=user)


def create_customer(
    repository: UserRepository,
    *,
    email: str = DEFAULT_CUSTOMER_EMAIL,
    first_name: str = "Access",
    last_name: str = "Customer",
    password: str = DEFAULT_CUSTOMER_PASSWORD,
) -> TestCustomer:
    return create_user(
        repository,
        email=email,
        first_name=first_name,
        last_name=last_name,
        password=password,
        user_type=USER_TYPE_CUSTOMER,
    )


def create_staff(
    repository: UserRepository,
    *,
    email: str = DEFAULT_STAFF_EMAIL,
    first_name: str = "Taylor",
    last_name: str = "Morgan",
    password: str = DEFAULT_STAFF_PASSWORD,
) -> TestUser:
    return create_user(
        repository,
        email=email,
        first_name=first_name,
        last_name=last_name,
        password=password,
        user_type=USER_TYPE_STAFF,
    )


def create_superadmin(
    repository: UserRepository,
    *,
    email: str = DEFAULT_SUPERADMIN_EMAIL,
    first_name: str = "Sam",
    last_name: str = "Rivera",
    password: str = DEFAULT_STAFF_PASSWORD,
) -> TestUser:
    return create_user(
        repository,
        email=email,
        first_name=first_name,
        last_name=last_name,
        password=password,
        user_type=USER_TYPE_STAFF,
        designation="Super Admin",
        permission="superadmin",
    )
