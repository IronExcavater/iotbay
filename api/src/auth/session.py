from collections.abc import Callable
from functools import wraps
from http import HTTPStatus

from flask import g, request
from src.auth.security import hash_session_token
from src.common.app import app_extension, app_str
from src.common.clock import UtcTime
from src.common.web import ApiError
from src.users.models import User
from src.users.repository import UserRepository


def authenticated_user_required(view: Callable) -> Callable:
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = _authenticated_user()
        g.authenticated_user = user
        return view(*args, **kwargs)

    return wrapped


def login_required(view: Callable) -> Callable:
    return authenticated_user_required(view)


def current_authenticated_user() -> User:
    user = getattr(g, "authenticated_user", None)
    if not isinstance(user, User):
        raise RuntimeError("authenticated user is not available")
    return user


def request_session_token() -> str | None:
    value = request.cookies.get(session_cookie_name())
    if value is None:
        return None

    value = value.strip()
    return value or None


def session_cookie_name() -> str:
    return app_str("AUTH_SESSION_COOKIE_NAME")


def _authenticated_user() -> User:
    session_token = request_session_token()
    if session_token is None:
        raise ApiError("authentication is required", HTTPStatus.UNAUTHORIZED)

    user = app_extension(
        "user_repository",
        UserRepository,
    ).find_user_by_session_token_hash(
        session_token_hash=hash_session_token(session_token),
        now_iso=UtcTime.now().iso,
    )
    if user is None:
        raise ApiError("authentication is required", HTTPStatus.UNAUTHORIZED)

    return user
