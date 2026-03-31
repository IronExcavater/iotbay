from dataclasses import dataclass

from flask.testing import FlaskClient
from src.auth.security import hash_password, hash_session_token, new_session_token
from src.common.app import extension_from
from src.common.clock import UtcTime
from src.users.models import USER_STATUS_ACTIVE, USER_TYPE_CUSTOMER, User
from src.users.repository import UserRepository


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
) -> TestSession:
    repository = extension_from(client.application, "user_repository", UserRepository)
    user = repository.create_user(
        email=email,
        password_hash=hash_password(password),
        first_name=first_name,
        last_name=last_name,
        user_type=USER_TYPE_CUSTOMER,
        status=USER_STATUS_ACTIVE,
    )

    session_token = new_session_token()
    now = UtcTime.now()
    repository.create_session(
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
