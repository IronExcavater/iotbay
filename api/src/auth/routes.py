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
    LoginMfaResendRequest,
    LoginMfaVerifyRequest,
    LoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    StaffInvitationQuery,
    UpdateMfaSettingsRequest,
    UpdateProfileRequest,
    VerifyEmailRequest,
)
from src.auth.session import (
    current_authenticated_staff_user,
    current_authenticated_user,
    login_required,
    request_session_token,
    request_trusted_session_token,
    session_cookie_name,
    staff_permission_required,
    trusted_session_cookie_name,
)
from src.common.app import app_bool, app_int, services
from src.common.web import ApiError, parse_query, parse_request, request_locale
from src.emails.service import DeliveredEmailArtifact
from src.users.models import STAFF_PERMISSION_SUPERADMIN, User

auth_bp = Blueprint("auth", __name__)


def _session_max_age() -> int:
    return app_int("AUTH_SESSION_LIFETIME_SECONDS")


def _trusted_session_max_age() -> int:
    return app_int("AUTH_TRUSTED_SESSION_LIFETIME_SECONDS")


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


def _set_trusted_session_cookie(response: Response, session_token: str) -> None:
    response.set_cookie(
        trusted_session_cookie_name(),
        session_token,
        max_age=_trusted_session_max_age(),
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


def _clear_trusted_session_cookie(response: Response) -> None:
    response.delete_cookie(
        trusted_session_cookie_name(),
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


def _parse_session_id(session_id: str) -> bytes:
    try:
        return UUID(session_id).bytes
    except ValueError as error:
        raise ApiError(
            "invalid session",
            HTTPStatus.BAD_REQUEST,
            code="SESSION_NOT_FOUND",
        ) from error


def _client_ip() -> str | None:
    forwarded_for = request.headers.get("X-Forwarded-For", "").strip()
    if forwarded_for:
        return forwarded_for.split(",", maxsplit=1)[0].strip() or None
    return request.remote_addr or None


def _user_agent() -> str | None:
    return request.headers.get("User-Agent", "").strip() or None


def _started_session_response(result, *, status_code: int = HTTPStatus.OK):
    response = make_response(_user_payload(result.user), status_code)
    _set_session_cookie(response, result.session_token)
    if result.trusted_session_token:
        _set_trusted_session_cookie(response, result.trusted_session_token)
    if result.clear_trusted_session_token:
        _clear_trusted_session_cookie(response)
    return response, status_code


def _login_mfa_payload(result) -> dict[str, object]:
    return {
        "mfaChallenge": {
            "challengeId": result.challenge_id,
            "expiresAt": result.expires_at,
            "maskedDestination": result.masked_destination,
        },
        **_download_payload(result.artifact),
    }


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
        data=parse_request(InviteStaffRequest),
        actor=current_authenticated_staff_user(STAFF_PERMISSION_SUPERADMIN),
        locale=request_locale(),
    )
    return (
        _verification_payload(email=result.email, artifact=result.artifact),
        HTTPStatus.ACCEPTED,
    )


@auth_bp.post("/login")
def login() -> ResponseReturnValue:
    auth_service = services().auth
    result = auth_service.begin_login(
        parse_request(LoginRequest),
        ip_address=_client_ip(),
        locale=request_locale(),
        trusted_session_token=request_trusted_session_token(),
        user_agent=_user_agent(),
    )
    if hasattr(result, "challenge"):
        response = make_response(_login_mfa_payload(result), HTTPStatus.ACCEPTED)
        if result.clear_trusted_session_token:
            _clear_trusted_session_cookie(response)
        return response, HTTPStatus.ACCEPTED

    return _started_session_response(result)


@auth_bp.post("/login/mfa/verify")
def verify_login_mfa() -> ResponseReturnValue:
    result = services().auth.verify_login_mfa(
        parse_request(LoginMfaVerifyRequest),
        ip_address=_client_ip(),
        user_agent=_user_agent(),
    )
    return _started_session_response(result)


@auth_bp.post("/login/mfa/resend")
def resend_login_mfa() -> ResponseReturnValue:
    result = services().auth.resend_login_mfa(
        parse_request(LoginMfaResendRequest),
        locale=request_locale(),
    )
    return _login_mfa_payload(result), HTTPStatus.ACCEPTED


@auth_bp.post("/verify-email")
def verify_email() -> ResponseReturnValue:
    auth_service = services().auth
    updated_user = auth_service.verify_email(parse_request(VerifyEmailRequest).token)
    return _started_session_response(auth_service.start_session(updated_user))


@auth_bp.get("/staff-invitation")
def staff_invitation() -> ResponseReturnValue:
    query = parse_query(StaffInvitationQuery)
    user = services().auth.invited_staff(query.token)
    return _user_payload(user), HTTPStatus.OK


@auth_bp.post("/staff-register")
def complete_staff_registration() -> ResponseReturnValue:
    auth_service = services().auth
    user = auth_service.complete_staff_invitation(
        parse_request(CompleteStaffInvitationRequest)
    )
    return _started_session_response(auth_service.start_session(user))


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


@auth_bp.get("/me/sessions")
@login_required
def list_sessions() -> ResponseReturnValue:
    sessions = services().auth.list_sessions(
        user=current_authenticated_user(),
        current_session_token=request_session_token(),
    )
    return {"items": [session.to_dict() for session in sessions]}, HTTPStatus.OK


@auth_bp.get("/admin/sessions")
@staff_permission_required(STAFF_PERMISSION_SUPERADMIN)
def list_admin_sessions() -> ResponseReturnValue:
    current_authenticated_staff_user(STAFF_PERMISSION_SUPERADMIN)
    sessions = services().auth.list_admin_sessions(
        current_session_token=request_session_token(),
    )
    return {"items": [session.to_dict() for session in sessions]}, HTTPStatus.OK


@auth_bp.delete("/me/sessions/<string:session_id>")
@login_required
def revoke_session(session_id: str) -> ResponseReturnValue:
    services().auth.revoke_session(
        actor=current_authenticated_user(),
        current_session_token=request_session_token(),
        ip_address=_client_ip(),
        session_id=_parse_session_id(session_id),
        user_agent=_user_agent(),
    )
    return {"ok": True}, HTTPStatus.OK


@auth_bp.delete("/admin/sessions/<string:session_id>")
@staff_permission_required(STAFF_PERMISSION_SUPERADMIN)
def admin_revoke_session(session_id: str) -> ResponseReturnValue:
    services().auth.admin_revoke_session(
        actor=current_authenticated_staff_user(STAFF_PERMISSION_SUPERADMIN),
        current_session_token=request_session_token(),
        ip_address=_client_ip(),
        session_id=_parse_session_id(session_id),
        user_agent=_user_agent(),
    )
    return {"ok": True}, HTTPStatus.OK


@auth_bp.post("/me/sessions/logout-others")
@login_required
def logout_other_sessions() -> ResponseReturnValue:
    ended_count = services().auth.logout_other_sessions(
        user=current_authenticated_user(),
        current_session_token=request_session_token(),
    )
    return {"endedCount": ended_count}, HTTPStatus.OK


@auth_bp.get("/me/mfa")
@login_required
def get_mfa_settings() -> ResponseReturnValue:
    return (
        services().auth.mfa_settings(user=current_authenticated_user()).to_dict(),
        HTTPStatus.OK,
    )


@auth_bp.patch("/me/mfa")
@login_required
def update_mfa_settings() -> ResponseReturnValue:
    settings = services().auth.update_mfa_settings(
        user=current_authenticated_user(),
        data=parse_request(UpdateMfaSettingsRequest),
    )
    return settings.to_dict(), HTTPStatus.OK


@auth_bp.get("/admin/users")
@staff_permission_required(STAFF_PERMISSION_SUPERADMIN)
def list_users() -> ResponseReturnValue:
    users = [user.to_dict() for user in services().user_repository.list_users()]
    return {"items": users}, HTTPStatus.OK


@auth_bp.get("/admin/users/<string:user_id>")
@staff_permission_required(STAFF_PERMISSION_SUPERADMIN)
def get_managed_user(user_id: str) -> ResponseReturnValue:
    user = services().user_repository.select_user_by_id(
        user_id=_parse_user_id(user_id),
    )
    if user is None:
        raise ApiError(
            "user was not found", HTTPStatus.NOT_FOUND, code="USER_NOT_FOUND"
        )
    return _user_payload(user), HTTPStatus.OK


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
    services().auth.logout(
        request_session_token(),
        ip_address=_client_ip(),
        user_agent=_user_agent(),
    )
    response = make_response("", HTTPStatus.NO_CONTENT)
    _clear_session_cookie(response)
    return response, HTTPStatus.NO_CONTENT
