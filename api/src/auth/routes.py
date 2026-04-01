from http import HTTPStatus

from flask import Blueprint, Response, make_response
from flask.typing import ResponseReturnValue
from src.auth.password_policy import validate_password
from src.auth.requests import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
    VerifyEmailRequest,
)
from src.auth.security import (
    hash_password,
    hash_session_token,
    hash_token,
    new_session_token,
    new_token,
    verify_password,
)
from src.auth.session import (
    current_authenticated_user,
    login_required,
    request_session_token,
    session_cookie_name,
)
from src.common.app import app_bool, app_extension, app_int, app_str
from src.common.clock import UtcTime
from src.common.web import ApiError, parse_request
from src.config import load_email_config
from src.emails.service import DeliveredEmailArtifact, EmailService
from src.users.models import (
    USER_STATUS_ACTIVE,
    USER_STATUS_UNVERIFIED,
    USER_TOKEN_PURPOSE_EMAIL_VERIFICATION,
    USER_TOKEN_PURPOSE_PASSWORD_RESET,
    USER_TYPE_CUSTOMER,
    User,
)
from src.users.repository import DuplicateEmailError, UserRepository

auth_bp = Blueprint("auth", __name__)


class AuthenticationError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "email or password is incorrect",
            HTTPStatus.UNAUTHORIZED,
            code="INVALID_CREDENTIALS",
        )


class InvalidPasswordResetTokenError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "password reset link is invalid or expired",
            HTTPStatus.BAD_REQUEST,
            code="INVALID_PASSWORD_RESET_TOKEN",
        )


class EmailVerificationRequiredError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "email verification is required",
            HTTPStatus.FORBIDDEN,
            code="EMAIL_NOT_VERIFIED",
        )


class InvalidEmailVerificationTokenError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "verification link is invalid or expired",
            HTTPStatus.BAD_REQUEST,
            code="INVALID_EMAIL_VERIFICATION_TOKEN",
        )


def _session_max_age() -> int:
    return app_int("AUTH_SESSION_LIFETIME_SECONDS")


def _password_reset_lifetime() -> int:
    return 900


def _email_verification_lifetime() -> int:
    return app_int("VERIFICATION_CODE_LIFETIME_SECONDS")


def _cookie_secure() -> bool:
    return app_bool("AUTH_COOKIE_SECURE")


def _web_url() -> str:
    return app_str("WEB_URL").rstrip("/")


def _user_payload(user: User) -> dict[str, object]:
    return {"user": user.to_dict()}


def _user_repository() -> UserRepository:
    return app_extension("user_repository", UserRepository)


def _email_service() -> EmailService:
    return EmailService(load_email_config())


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


def _token_url(path: str, token: str) -> str:
    return f"{_web_url()}{path}?token={token}"


def _issue_user_token(
    *,
    user: User,
    purpose: str,
    lifetime_seconds: int,
) -> tuple[str, str]:
    token = new_token()
    now = UtcTime.now()
    expires_at = now.add(seconds=lifetime_seconds).iso
    repository = _user_repository()
    repository.delete_user_tokens_by_user_id_and_purpose(
        user_id=user.user_id,
        purpose=purpose,
    )
    repository.save_user_token(
        user_id=user.user_id,
        purpose=purpose,
        token_hash=hash_token(token),
        created_at=now.iso,
        expires_at=expires_at,
    )
    return token, expires_at


def _password_reset_url(token: str) -> str:
    return _token_url("/reset-password", token)


def _verification_url(token: str) -> str:
    return _token_url("/verify-email", token)


def _download_payload(artifact: DeliveredEmailArtifact) -> dict[str, object]:
    if artifact.transport != "download":
        return {}

    return {
        "download": {
            "filename": artifact.filename,
            "html": artifact.content,
        }
    }


@auth_bp.post("/register")
def register() -> ResponseReturnValue:
    data = parse_request(RegisterRequest)
    password = validate_password(
        data.password,
        email=data.email,
        first_name=data.first_name,
        last_name=data.last_name,
    )

    repository = _user_repository()
    existing_user = repository.find_user_by_email(email=data.email)
    if existing_user is not None and (
        not existing_user.needs_email_verification
        or existing_user.user_type != USER_TYPE_CUSTOMER
    ):
        raise DuplicateEmailError()

    user = repository.create_or_update_user(
        email=data.email,
        password_hash=hash_password(password),
        first_name=data.first_name,
        last_name=data.last_name,
        user_type=USER_TYPE_CUSTOMER,
        status=USER_STATUS_UNVERIFIED,
        address_id=existing_user.address_id if existing_user is not None else None,
    )
    token, expires_at = _issue_user_token(
        user=user,
        purpose=USER_TOKEN_PURPOSE_EMAIL_VERIFICATION,
        lifetime_seconds=_email_verification_lifetime(),
    )
    artifact = _email_service().send_verification_link(
        email=user.email,
        verification_url=_verification_url(token),
        expires_at=expires_at,
    )
    return {
        "verification": {"email": user.email},
        **_download_payload(artifact),
    }, HTTPStatus.ACCEPTED


@auth_bp.post("/login")
def login() -> ResponseReturnValue:
    data = parse_request(LoginRequest)
    user = _user_repository().find_user_by_email(email=data.email)
    if user is None:
        raise AuthenticationError()

    if not verify_password(data.password, user.password_hash):
        raise AuthenticationError()
    if user.needs_email_verification:
        raise EmailVerificationRequiredError()
    if not user.is_active:
        raise AuthenticationError()

    response = make_response(_user_payload(user), HTTPStatus.OK)
    _set_session_cookie(response, _start_session(user))
    return response, HTTPStatus.OK


@auth_bp.post("/verify-email")
def verify_email() -> ResponseReturnValue:
    data = parse_request(VerifyEmailRequest)
    token_hash = hash_token(data.token)
    repository = _user_repository()
    user = repository.find_user_by_token_hash(
        token_hash=token_hash,
        purpose=USER_TOKEN_PURPOSE_EMAIL_VERIFICATION,
        now_iso=UtcTime.now().iso,
    )
    if user is None:
        raise InvalidEmailVerificationTokenError()

    updated_user = repository.update_user_status(
        user_id=user.user_id,
        status=USER_STATUS_ACTIVE,
        updated_at=UtcTime.now().iso,
    )
    repository.delete_user_token_by_hash(token_hash=token_hash)

    response = make_response(_user_payload(updated_user), HTTPStatus.OK)
    _set_session_cookie(response, _start_session(updated_user))
    return response, HTTPStatus.OK


@auth_bp.post("/forgot-password")
def forgot_password() -> ResponseReturnValue:
    data = parse_request(ForgotPasswordRequest)
    user = _user_repository().find_user_by_email(email=data.email)
    if user is not None and user.is_active:
        token, expires_at = _issue_user_token(
            user=user,
            purpose=USER_TOKEN_PURPOSE_PASSWORD_RESET,
            lifetime_seconds=_password_reset_lifetime(),
        )
        artifact = _email_service().send_password_reset_link(
            email=user.email,
            reset_url=_password_reset_url(token),
            expires_at=expires_at,
        )
        download_payload = _download_payload(artifact)
        if download_payload:
            return download_payload, HTTPStatus.OK

    response = make_response("", HTTPStatus.NO_CONTENT)
    return response, HTTPStatus.NO_CONTENT


@auth_bp.post("/reset-password")
def reset_password() -> ResponseReturnValue:
    data = parse_request(ResetPasswordRequest)
    token_hash = hash_token(data.token)
    repository = _user_repository()
    user = repository.find_user_by_token_hash(
        token_hash=token_hash,
        purpose=USER_TOKEN_PURPOSE_PASSWORD_RESET,
        now_iso=UtcTime.now().iso,
    )
    if user is None:
        raise InvalidPasswordResetTokenError()

    password = validate_password(
        data.password,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
    )
    now_iso = UtcTime.now().iso
    repository.update_user_password(
        user_id=user.user_id,
        password_hash=hash_password(password),
        updated_at=now_iso,
    )
    repository.delete_sessions_by_user_id(user_id=user.user_id)
    repository.delete_user_token_by_hash(token_hash=token_hash)
    return {"ok": True}, HTTPStatus.OK


@auth_bp.get("/me")
@login_required
def me() -> ResponseReturnValue:
    return _user_payload(current_authenticated_user()), HTTPStatus.OK


@auth_bp.patch("/me")
@login_required
def update_me() -> ResponseReturnValue:
    data = parse_request(UpdateProfileRequest)
    user = current_authenticated_user()
    updated_user = _user_repository().update_user_profile(
        user_id=user.user_id,
        email=data.email,
        first_name=data.first_name,
        last_name=data.last_name,
        updated_at=UtcTime.now().iso,
    )
    return _user_payload(updated_user), HTTPStatus.OK


@auth_bp.post("/logout")
@login_required
def logout() -> ResponseReturnValue:
    session_token = request_session_token()
    if session_token is not None:
        _user_repository().delete_session_by_token_hash(
            session_token_hash=hash_session_token(session_token)
        )

    response = make_response("", HTTPStatus.NO_CONTENT)
    _clear_session_cookie(response)
    return response, HTTPStatus.NO_CONTENT
