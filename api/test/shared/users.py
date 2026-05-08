from dataclasses import dataclass

from src.auth.security import hash_password
from src.users.models import USER_STATUS_ACTIVE, USER_TYPE_CUSTOMER, User
from src.users.repository import UserRepository

DEFAULT_CUSTOMER_EMAIL = "access.customer@example.com"
DEFAULT_CUSTOMER_PASSWORD = "LogPass99$"


@dataclass(slots=True, frozen=True)
class TestCustomer:
    email: str
    password: str
    user: User


def create_customer(
    repository: UserRepository,
    *,
    email: str = DEFAULT_CUSTOMER_EMAIL,
    first_name: str = "Access",
    last_name: str = "Customer",
    password: str = DEFAULT_CUSTOMER_PASSWORD,
) -> TestCustomer:
    user = repository.insert_user(
        email=email,
        password_hash=hash_password(password),
        first_name=first_name,
        last_name=last_name,
        user_type=USER_TYPE_CUSTOMER,
        status=USER_STATUS_ACTIVE,
    )
    return TestCustomer(email=email, password=password, user=user)
