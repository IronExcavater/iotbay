from collections.abc import Callable
from functools import wraps
from http import HTTPStatus

from flask import g, request
from src.auth.security import hash_session_token
from src.common.app import app_str, services
from src.common.clock import UtcTime
from src.common.text import stripped_or_none
from src.common.web import ApiError
from src.users.models import User


def login_required(view: Callable) -> Callable:
    @wraps(view)
    def wrapped(*args, **kwargs):
        current_authenticated_user()
        return view(*args, **kwargs)

    return wrapped


def current_authenticated_user() -> User:
    user = getattr(g, "authenticated_user", None)
    if isinstance(user, User):
        return user

    user = _load_authenticated_user()
    g.authenticated_user = user
    return user


def current_authenticated_staff_user(*required_permissions: str) -> User:
    user = current_authenticated_user()
    if not user.is_staff:
        raise _staff_account_required()
    if required_permissions and user.permission not in required_permissions:
        raise _staff_permission_required()
    return user


def request_session_token() -> str | None:
    # The browser stores an opaque HttpOnly session cookie. Routes read the raw
    # value here, but repositories only ever see the hashed form.
    return stripped_or_none(request.cookies.get(session_cookie_name()))


def session_cookie_name() -> str:
    return app_str("AUTH_SESSION_COOKIE_NAME")


def _load_authenticated_user() -> User:
    session_token = request_session_token()
    if session_token is None:
        raise _authentication_required()

    # Sessions are looked up by hash so the database never stores or compares
    # the raw cookie value sent by the browser.
    user = services().user_repository.select_user_by_session_token_hash(
        session_token_hash=hash_session_token(session_token),
        now_iso=UtcTime.now().iso,
    )
    if user is None:
        raise _authentication_required()

    return user


def staff_permission_required(*required_permissions: str) -> Callable:
    def decorator(view: Callable) -> Callable:
        @wraps(view)
        def wrapped(*args, **kwargs):
            current_authenticated_staff_user(*required_permissions)
            return view(*args, **kwargs)

        return wrapped

    return decorator


def _authentication_required() -> ApiError:
    return ApiError("authentication is required", HTTPStatus.UNAUTHORIZED)


def _staff_account_required() -> ApiError:
    return ApiError(
        "staff account is required",
        HTTPStatus.FORBIDDEN,
        code="STAFF_ACCOUNT_REQUIRED",
    )


def _staff_permission_required() -> ApiError:
    return ApiError(
        "staff permission is required",
        HTTPStatus.FORBIDDEN,
        code="STAFF_PERMISSION_REQUIRED",
    )
