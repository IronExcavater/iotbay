from http import HTTPStatus
from uuid import UUID

from flask import Blueprint, Response, make_response, request
from flask.typing import ResponseReturnValue
from src.auth.requests import (
    AdminSetUserStatusRequest,
    AdminUpdateUserRequest,
    ChangePendingEmailRequest,
    CompleteStaffInvitationRequest,
    ForgotPasswordRequest,
    InviteStaffRequest,
    LoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
    VerifyEmailRequest,
)
from src.auth.session import (
    current_authenticated_staff_user,
    current_authenticated_user,
    login_required,
    request_session_token,
    session_cookie_name,
    staff_permission_required,
)
from src.common.app import app_bool, app_int, services
from src.common.web import ApiError, parse_request, request_locale
from src.emails.service import DeliveredEmailArtifact
from src.users.models import STAFF_PERMISSION_SUPERADMIN, User

auth_bp = Blueprint("auth", __name__)


def _session_max_age() -> int:
    return app_int("AUTH_SESSION_LIFETIME_SECONDS")


def _cookie_secure() -> bool:
    return app_bool("AUTH_COOKIE_SECURE")


def _user_payload(user: User) -> dict[str, object]:
    return {"user": user.to_dict()}


def _verification_payload(
    *,
    email: str,
    artifact: DeliveredEmailArtifact,
) -> dict[str, object]:
    return {
        "verification": {"email": email},
        **_download_payload(artifact),
    }


def _set_session_cookie(response: Response, session_token: str) -> None:
    # The browser stores the opaque session token in an HttpOnly cookie; the
    # frontend never reads or writes this value directly.
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


def _download_payload(artifact: DeliveredEmailArtifact) -> dict[str, object]:
    if artifact.transport != "download":
        return {}

    return {
        "download": {
            "filename": artifact.filename,
            "html": artifact.content,
        }
    }


def _parse_user_id(user_id: str) -> bytes:
    try:
        return UUID(user_id).bytes
    except ValueError as error:
        raise ApiError(
            "invalid user",
            HTTPStatus.BAD_REQUEST,
            code="USER_NOT_FOUND",
        ) from error


@auth_bp.post("/register")
def register() -> ResponseReturnValue:
    result = services().auth.register_customer(
        parse_request(RegisterRequest),
        locale=request_locale(),
    )
    return {
        **_verification_payload(email=result.email, artifact=result.artifact),
    }, HTTPStatus.ACCEPTED


@auth_bp.post("/admin/staff-invitations")
@staff_permission_required(STAFF_PERMISSION_SUPERADMIN)
def invite_staff() -> ResponseReturnValue:
    result = services().auth.invite_staff(
        parse_request(InviteStaffRequest),
        locale=request_locale(),
    )
    return (
        _verification_payload(email=result.email, artifact=result.artifact),
        HTTPStatus.ACCEPTED,
    )


@auth_bp.post("/login")
def login() -> ResponseReturnValue:
    auth_service = services().auth
    # Authenticate the submitted credentials first, then attach a new session
    # cookie so subsequent requests can be matched back to this user.
    user = auth_service.authenticate(parse_request(LoginRequest))
    response = make_response(_user_payload(user), HTTPStatus.OK)
    _set_session_cookie(response, auth_service.start_session(user))
    return response, HTTPStatus.OK


@auth_bp.post("/verify-email")
def verify_email() -> ResponseReturnValue:
    auth_service = services().auth
    updated_user = auth_service.verify_email(parse_request(VerifyEmailRequest).token)
    response = make_response(_user_payload(updated_user), HTTPStatus.OK)
    _set_session_cookie(response, auth_service.start_session(updated_user))
    return response, HTTPStatus.OK


@auth_bp.get("/staff-invitation")
def staff_invitation() -> ResponseReturnValue:
    token = request.args.get("token", "").strip()
    user = services().auth.invited_staff(token)
    return _user_payload(user), HTTPStatus.OK


@auth_bp.post("/staff-register")
def complete_staff_registration() -> ResponseReturnValue:
    auth_service = services().auth
    user = auth_service.complete_staff_invitation(
        parse_request(CompleteStaffInvitationRequest)
    )
    response = make_response(_user_payload(user), HTTPStatus.OK)
    _set_session_cookie(response, auth_service.start_session(user))
    return response, HTTPStatus.OK


@auth_bp.post("/forgot-password")
def forgot_password() -> ResponseReturnValue:
    artifact = services().auth.request_password_reset(
        parse_request(ForgotPasswordRequest),
        locale=request_locale(),
    )
    if artifact is not None:
        download_payload = _download_payload(artifact)
        if download_payload:
            return download_payload, HTTPStatus.OK

    response = make_response("", HTTPStatus.NO_CONTENT)
    return response, HTTPStatus.NO_CONTENT


@auth_bp.post("/resend-verification")
def resend_verification() -> ResponseReturnValue:
    artifact = services().auth.resend_verification(
        parse_request(ResendVerificationRequest),
        locale=request_locale(),
    )
    if artifact is None:
        return {"ok": True}, HTTPStatus.OK

    return _download_payload(artifact) or {"ok": True}, HTTPStatus.OK


@auth_bp.post("/change-pending-email")
def change_pending_email() -> ResponseReturnValue:
    result = services().auth.change_pending_email(
        parse_request(ChangePendingEmailRequest),
        locale=request_locale(),
    )
    return (
        _verification_payload(email=result.email, artifact=result.artifact),
        HTTPStatus.ACCEPTED,
    )


@auth_bp.post("/reset-password")
def reset_password() -> ResponseReturnValue:
    services().auth.reset_password(parse_request(ResetPasswordRequest))
    return {"ok": True}, HTTPStatus.OK


@auth_bp.get("/me")
@login_required
def me() -> ResponseReturnValue:
    return _user_payload(current_authenticated_user()), HTTPStatus.OK


@auth_bp.get("/admin/users")
@staff_permission_required(STAFF_PERMISSION_SUPERADMIN)
def list_users() -> ResponseReturnValue:
    users = [user.to_dict() for user in services().user_repository.list_users()]
    return {"items": users}, HTTPStatus.OK


@auth_bp.patch("/admin/users/<string:user_id>")
@staff_permission_required(STAFF_PERMISSION_SUPERADMIN)
def update_managed_user(user_id: str) -> ResponseReturnValue:
    user = services().auth.update_managed_user(
        actor=current_authenticated_staff_user(STAFF_PERMISSION_SUPERADMIN),
        target_user_id=_parse_user_id(user_id),
        data=parse_request(AdminUpdateUserRequest),
    )
    return _user_payload(user), HTTPStatus.OK


@auth_bp.patch("/admin/users/<string:user_id>/status")
@staff_permission_required(STAFF_PERMISSION_SUPERADMIN)
def update_managed_user_status(user_id: str) -> ResponseReturnValue:
    user = services().auth.update_managed_user_status(
        actor=current_authenticated_staff_user(STAFF_PERMISSION_SUPERADMIN),
        target_user_id=_parse_user_id(user_id),
        data=parse_request(AdminSetUserStatusRequest),
    )
    return _user_payload(user), HTTPStatus.OK


@auth_bp.patch("/me")
@login_required
def update_me() -> ResponseReturnValue:
    result = services().auth.update_user(
        user=current_authenticated_user(),
        data=parse_request(UpdateProfileRequest),
        locale=request_locale(),
    )
    if isinstance(result, User):
        return _user_payload(result), HTTPStatus.OK
    response = make_response(
        _verification_payload(email=result.email, artifact=result.artifact),
        HTTPStatus.ACCEPTED,
    )
    _clear_session_cookie(response)
    return response, HTTPStatus.ACCEPTED


@auth_bp.post("/logout")
@login_required
def logout() -> ResponseReturnValue:
    # Remove the persisted session record for the current cookie and instruct
    # the browser to drop the auth cookie as part of logout.
    services().auth.logout(request_session_token())
    response = make_response("", HTTPStatus.NO_CONTENT)
    _clear_session_cookie(response)
    return response, HTTPStatus.NO_CONTENT
