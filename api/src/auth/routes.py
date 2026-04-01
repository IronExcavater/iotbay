from http import HTTPStatus

from flask import Blueprint, Response, make_response
from src.auth.requests import LoginRequest, RegisterRequest
from src.auth.security import (
    hash_password,
    hash_session_token,
    new_session_token,
    validate_password,
    verify_password,
)
from src.auth.session import (
    current_authenticated_user,
    login_required,
    request_session_token,
    session_cookie_name,
)
from src.common.app import app_bool, app_extension, app_int
from src.common.clock import UtcTime
from src.common.web import ApiError, parse_request
from src.users.models import USER_STATUS_ACTIVE, USER_TYPE_CUSTOMER, User
from src.users.repository import UserRepository

auth_bp = Blueprint("auth", __name__)


class AuthenticationError(ApiError):
    def __init__(self) -> None:
        super().__init__("email or password is incorrect", HTTPStatus.UNAUTHORIZED)


def _session_max_age() -> int:
    return app_int("AUTH_SESSION_LIFETIME_SECONDS")


def _cookie_secure() -> bool:
    return app_bool("AUTH_COOKIE_SECURE")


def _user_payload(user: User) -> dict[str, object]:
    return {"user": user.to_dict()}


def _user_repository() -> UserRepository:
    return app_extension("user_repository", UserRepository)


def _set_session_cookie(response: Response, session_token: str) -> None:
    response.set_cookie(
        session_cookie_name(),
        session_token,
        max_age=_session_max_age(),
        httponly=True,
        samesite="Lax",
        secure=_cookie_secure(),
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        session_cookie_name(),
        httponly=True,
        samesite="Lax",
        secure=_cookie_secure(),
        path="/",
    )


def _start_session(user: User) -> str:
    session_token = new_session_token()
    now = UtcTime.now()
    _user_repository().create_session(
        user_id=user.user_id,
        session_token_hash=hash_session_token(session_token),
        created_at=now.iso,
        expires_at=now.add(seconds=_session_max_age()).iso,
    )
    return session_token


@auth_bp.post("/register")
def register() -> tuple[Response, int]:
    data = parse_request(RegisterRequest)
    password = validate_password(data.password)

    user = _user_repository().create_user(
        email=data.email,
        password_hash=hash_password(password),
        first_name=data.first_name,
        last_name=data.last_name,
        user_type=USER_TYPE_CUSTOMER,
        status=USER_STATUS_ACTIVE,
    )

    response = make_response(_user_payload(user), HTTPStatus.CREATED)
    _set_session_cookie(response, _start_session(user))
    return response, HTTPStatus.CREATED


@auth_bp.post("/login")
def login() -> tuple[Response, int]:
    data = parse_request(LoginRequest)
    user = _user_repository().find_user_by_email(email=data.email)
    if user is None:
        raise AuthenticationError()

    if not verify_password(data.password, user.password_hash):
        raise AuthenticationError()

    response = make_response(_user_payload(user), HTTPStatus.OK)
    _set_session_cookie(response, _start_session(user))
    return response, HTTPStatus.OK


@auth_bp.get("/me")
@login_required
def me() -> tuple[dict[str, object], int]:
    return _user_payload(current_authenticated_user()), HTTPStatus.OK


@auth_bp.post("/logout")
@login_required
def logout() -> tuple[Response, int]:
    session_token = request_session_token()
    if session_token is not None:
        _user_repository().delete_session_by_token_hash(
            session_token_hash=hash_session_token(session_token)
        )

    response = make_response("", HTTPStatus.NO_CONTENT)
    _clear_session_cookie(response)
    return response, HTTPStatus.NO_CONTENT
