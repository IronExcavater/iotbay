from dataclasses import dataclass

from flask.testing import FlaskClient
from src.auth.security import hash_session_token, new_session_token
from src.common.app import extension_from
from src.common.clock import UtcTime
from src.users.models import USER_TYPE_CUSTOMER, USER_TYPE_STAFF, User
from src.users.repository import UserRepository

from test.shared.users import create_customer, create_staff, create_superadmin


@dataclass(slots=True, frozen=True)
class TestSession:
    email: str
    password: str
    session_token: str
    user: User


def create_test_session(
    client: FlaskClient,
    *,
    email: str = "alex.customer@example.com",
    password: str = "CedarGrove42",
    first_name: str = "Alex",
    last_name: str = "Nguyen",
    user_type: str = USER_TYPE_CUSTOMER,
) -> TestSession:
    repository = extension_from(client.application, "user_repository", UserRepository)
    test_user = (
        create_staff(
            repository,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )
        if user_type != USER_TYPE_CUSTOMER
        else create_customer(
            repository,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )
    )
    return _start_session(client, test_user.user, email=email, password=password)


def create_staff_test_session(
    client: FlaskClient,
    *,
    email: str = "taylor.staff@example.com",
    password: str = "Harbour84!",
    first_name: str = "Taylor",
    last_name: str = "Morgan",
) -> TestSession:
    return create_test_session(
        client,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        user_type=USER_TYPE_STAFF,
    )


def create_superadmin_test_session(
    client: FlaskClient,
    *,
    email: str = "sam.superadmin@example.com",
    password: str = "Harbour84!",
    first_name: str = "Sam",
    last_name: str = "Rivera",
) -> TestSession:
    repository = extension_from(client.application, "user_repository", UserRepository)
    test_user = create_superadmin(
        repository,
        email=email,
        first_name=first_name,
        last_name=last_name,
        password=password,
    )
    return _start_session(client, test_user.user, email=email, password=password)


def _start_session(
    client: FlaskClient,
    user: User,
    *,
    email: str,
    password: str,
) -> TestSession:
    session_token = new_session_token()
    now = UtcTime.now()
    repository = extension_from(client.application, "user_repository", UserRepository)
    repository.insert_user_session(
        user_id=user.user_id,
        session_token_hash=hash_session_token(session_token),
        created_at=now.iso,
        expires_at=now.add(
            seconds=int(client.application.config["AUTH_SESSION_LIFETIME_SECONDS"])
        ).iso,
    )
    client.set_cookie(
        key=str(client.application.config["AUTH_SESSION_COOKIE_NAME"]),
        value=session_token,
        path="/",
    )

    return TestSession(
        email=email,
        password=password,
        session_token=session_token,
        user=user,
    )
