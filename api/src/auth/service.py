import hmac
import secrets
from dataclasses import dataclass
from http import HTTPStatus
from urllib.parse import urlencode
from uuid import UUID

from src.access_logs.models import (
    ACCESS_EVENT_LOGIN,
    ACCESS_EVENT_LOGOUT,
    ACCESS_EVENT_SESSION_REVOKED,
)
from src.access_logs.repository import AccessLogRepository
from src.addresses.service import AddressService
from src.audit.models import (
    AUDIT_ACTION_EMAIL_VERIFIED,
    AUDIT_ACTION_LOGOUT_OTHERS,
    AUDIT_ACTION_MANAGED_USER_UPDATED,
    AUDIT_ACTION_MFA_SETTINGS_UPDATED,
    AUDIT_ACTION_PASSWORD_UPDATED,
    AUDIT_ACTION_PROFILE_UPDATED,
    AUDIT_ACTION_SESSION_REVOKED,
    AUDIT_ACTION_STAFF_INVITED,
    AUDIT_ACTION_STAFF_REGISTRATION_COMPLETED,
    AUDIT_ACTION_STATUS_CHANGED,
)
from src.audit.models import (
    ENTITY_TYPE_USER as AUDIT_ENTITY_TYPE_USER,
)
from src.audit.service import AuditService
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
    UpdateMfaSettingsRequest,
    UpdateProfileRequest,
)
from src.auth.security import (
    hash_password,
    hash_session_token,
    hash_token,
    new_session_token,
    new_token,
    verify_password,
)
from src.common.clock import UtcTime
from src.common.web import ApiError
from src.emails.service import DeliveredEmailArtifact, EmailService
from src.media.repository import (
    InvalidMediaDataError,
    MediaRepository,
    is_data_image_url,
)
from src.users.models import (
    AUTH_CHALLENGE_PURPOSE_LOGIN_EMAIL_MFA,
    AUTH_METHOD_PASSWORD,
    AUTH_METHOD_PASSWORD_EMAIL_MFA,
    AUTH_METHOD_TRUSTED_BROWSER,
    SESSION_ENDED_REASON_EMAIL_CHANGED,
    SESSION_ENDED_REASON_LOGOUT,
    SESSION_ENDED_REASON_LOGOUT_OTHERS,
    SESSION_ENDED_REASON_PASSWORD_RESET,
    SESSION_ENDED_REASON_REVOKED,
    STAFF_PERMISSION_ADMIN,
    USER_STATUS_ACTIVE,
    USER_STATUS_UNVERIFIED,
    USER_TOKEN_PURPOSE_EMAIL_VERIFICATION,
    USER_TOKEN_PURPOSE_PASSWORD_RESET,
    USER_TOKEN_PURPOSE_STAFF_INVITATION,
    USER_TYPE_CUSTOMER,
    USER_TYPE_STAFF,
    AuthChallenge,
    User,
    UserDetails,
    UserMfaSettings,
    UserSessionInfo,
    build_user_details,
    permission_rank,
    validate_user_password,
)
from src.users.repository import DuplicateEmailError, UserRepository


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


class StaffAccountRequiredError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "staff account is required",
            HTTPStatus.FORBIDDEN,
            code="STAFF_ACCOUNT_REQUIRED",
        )


class CustomerAccountRequiredError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "customer account is required",
            HTTPStatus.FORBIDDEN,
            code="CUSTOMER_ACCOUNT_REQUIRED",
        )


class InvalidEmailVerificationTokenError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "verification link is invalid or expired",
            HTTPStatus.BAD_REQUEST,
            code="INVALID_EMAIL_VERIFICATION_TOKEN",
        )


class InvalidStaffInvitationTokenError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "staff invitation link is invalid or expired",
            HTTPStatus.BAD_REQUEST,
            code="INVALID_STAFF_INVITATION_TOKEN",
        )


class CurrentPasswordRequiredError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "current password is required to save changes",
            HTTPStatus.BAD_REQUEST,
            code="CURRENT_PASSWORD_REQUIRED",
        )


class CurrentPasswordIncorrectError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "current password is incorrect",
            HTTPStatus.UNAUTHORIZED,
            code="CURRENT_PASSWORD_INCORRECT",
        )


class PendingVerificationRequiredError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "email verification is pending",
            HTTPStatus.BAD_REQUEST,
            code="EMAIL_VERIFICATION_PENDING",
        )


class ManagedUserNotFoundError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "user was not found",
            HTTPStatus.NOT_FOUND,
            code="USER_NOT_FOUND",
        )


class UserManagementNotAllowedError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "you cannot manage that user",
            HTTPStatus.FORBIDDEN,
            code="USER_MANAGEMENT_NOT_ALLOWED",
        )


class UserPermissionEscalationError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "you cannot assign that permission",
            HTTPStatus.FORBIDDEN,
            code="USER_PERMISSION_ESCALATION_NOT_ALLOWED",
        )


class SessionNotFoundError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "session was not found",
            HTTPStatus.NOT_FOUND,
            code="SESSION_NOT_FOUND",
        )


class CurrentSessionRevocationNotAllowedError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "you cannot revoke the current session",
            HTTPStatus.BAD_REQUEST,
            code="CURRENT_SESSION_REVOCATION_NOT_ALLOWED",
        )


class InvalidLoginMfaChallengeError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "login code is invalid or expired",
            HTTPStatus.BAD_REQUEST,
            code="INVALID_LOGIN_MFA_CHALLENGE",
        )


class LoginMfaAttemptsExceededError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "too many login code attempts",
            HTTPStatus.TOO_MANY_REQUESTS,
            code="LOGIN_MFA_ATTEMPTS_EXCEEDED",
        )


@dataclass(slots=True, frozen=True)
class VerificationDelivery:
    email: str
    artifact: DeliveredEmailArtifact


@dataclass(slots=True, frozen=True)
class StartedSession:
    session_token: str
    trusted_session_token: str | None
    user: User
    clear_trusted_session_token: bool = False


@dataclass(slots=True, frozen=True)
class LoginMfaChallengeDelivery:
    artifact: DeliveredEmailArtifact
    challenge: AuthChallenge
    clear_trusted_session_token: bool = False

    @property
    def challenge_id(self) -> str:
        return self.challenge.id

    @property
    def expires_at(self) -> str:
        return self.challenge.expires_at

    @property
    def masked_destination(self) -> str:
        name, _, domain = self.challenge.delivery_email.partition("@")
        if not domain:
            return self.challenge.delivery_email
        visible = name[:2] if len(name) > 2 else name[:1]
        return f"{visible}{'*' * max(2, len(name) - len(visible))}@{domain}"


@dataclass(slots=True)
class AuthService:
    access_log_repository: AccessLogRepository
    address_service: AddressService
    audit: AuditService
    email_service: EmailService
    login_mfa_lifetime_seconds: int
    media_repository: MediaRepository
    password_reset_lifetime_seconds: int
    session_lifetime_seconds: int
    trusted_session_lifetime_seconds: int
    user_repository: UserRepository
    verification_lifetime_seconds: int
    web_url: str

    def register_customer(
        self,
        data: RegisterRequest,
        *,
        locale: str,
    ) -> VerificationDelivery:
        password = validate_user_password(
            data.password,
            email=data.email,
            first_name=data.first_name,
            last_name=data.last_name,
        )
        details = self._user_details(data)
        existing_user = self.user_repository.select_user_by_email(email=data.email)
        if existing_user is not None and (
            not existing_user.needs_email_verification
            or existing_user.user_type != USER_TYPE_CUSTOMER
        ):
            raise DuplicateEmailError()

        user = self.user_repository.upsert_user(
            email=data.email,
            password_hash=hash_password(password),
            first_name=data.first_name,
            last_name=data.last_name,
            user_type=USER_TYPE_CUSTOMER,
            status=USER_STATUS_UNVERIFIED,
            address_line_two=details.address_line_two,
            phone_number=details.phone_number,
            validated_address=details.validated_address,
        )
        return VerificationDelivery(
            email=user.email,
            artifact=self._send_verification(user, locale=locale),
        )

    def invite_staff(
        self,
        data: InviteStaffRequest,
        *,
        locale: str,
        actor: User | None = None,
    ) -> VerificationDelivery:
        existing_user = self.user_repository.select_user_by_email(email=data.email)
        if existing_user is not None and (
            existing_user.user_type != USER_TYPE_STAFF
            or not existing_user.needs_email_verification
        ):
            raise DuplicateEmailError()

        user = self.user_repository.upsert_user(
            email=data.email,
            password_hash=hash_password(new_token()),
            first_name=existing_user.first_name if existing_user else "Invited",
            last_name=existing_user.last_name if existing_user else "Staff",
            user_type=USER_TYPE_STAFF,
            status=USER_STATUS_UNVERIFIED,
            staff_id=data.staff_id,
            designation=data.designation,
            permission=data.permission or None,
        )
        self._record_user_audit(
            action=AUDIT_ACTION_STAFF_INVITED,
            actor_user_id=actor.user_id if actor is not None else None,
            entity_id=user.user_id,
            after={"email": user.email, "permission": user.permission},
        )
        return VerificationDelivery(
            email=user.email,
            artifact=self._send_staff_invitation(user, locale=locale),
        )

    def authenticate(self, data: LoginRequest) -> User:
        # Load the user record by email, then verify the submitted password
        # against the stored password hash before allowing login.
        user = self.user_repository.select_user_by_email(email=data.email)
        if user is None or not verify_password(data.password, user.password_hash):
            raise AuthenticationError()
        if user.needs_email_verification:
            raise EmailVerificationRequiredError()
        if not user.is_active:
            raise AuthenticationError()
        if data.user_type and user.user_type != data.user_type:
            if data.user_type == USER_TYPE_STAFF:
                raise StaffAccountRequiredError()

            raise CustomerAccountRequiredError()
        return user

    def begin_login(
        self,
        data: LoginRequest,
        *,
        ip_address: str | None,
        locale: str,
        trusted_session_token: str | None,
        user_agent: str | None,
    ) -> StartedSession | LoginMfaChallengeDelivery:
        user = self.authenticate(data)
        now = UtcTime.now()
        mfa_settings = self.mfa_settings(user=user)
        if not mfa_settings.email_enabled:
            return self.start_session(
                user,
                auth_method=AUTH_METHOD_PASSWORD,
                ip_address=ip_address,
                user_agent=user_agent,
            )

        trusted_token = None
        if trusted_session_token:
            trusted_token = self.user_repository.select_valid_trusted_session_token(
                user_id=user.user_id,
                token_hash=hash_session_token(trusted_session_token),
                now_iso=now.iso,
            )
        if trusted_token is not None:
            return self.start_session(
                user,
                auth_method=AUTH_METHOD_TRUSTED_BROWSER,
                ip_address=ip_address,
                trusted_token_id=trusted_token.trusted_session_token_id,
                user_agent=user_agent,
            )

        return self._issue_login_mfa_challenge(
            user,
            clear_trusted_session_token=trusted_session_token is not None,
            locale=locale,
        )

    def verify_login_mfa(
        self,
        data: LoginMfaVerifyRequest,
        *,
        ip_address: str | None,
        user_agent: str | None,
    ) -> StartedSession:
        challenge = self._require_login_mfa_challenge(data.challenge_id)
        if challenge.attempt_count >= 5:
            raise LoginMfaAttemptsExceededError()
        if not hmac.compare_digest(hash_token(data.code), challenge.code_hash):
            attempts = self.user_repository.increment_auth_challenge_attempts(
                auth_challenge_id=challenge.auth_challenge_id,
            )
            if attempts >= 5:
                raise LoginMfaAttemptsExceededError()
            raise InvalidLoginMfaChallengeError()

        user = self.user_repository.select_user_by_id(user_id=challenge.user_id)
        if user is None or not user.is_active:
            raise InvalidLoginMfaChallengeError()

        now = UtcTime.now()
        self.user_repository.complete_auth_challenge(
            auth_challenge_id=challenge.auth_challenge_id,
            completed_at=now.iso,
        )
        trusted_session_token = None
        trusted_token_id = None
        if data.trust_browser:
            trusted_session_token = new_session_token()
            trusted_token = self.user_repository.insert_trusted_session_token(
                user_id=user.user_id,
                token_hash=hash_session_token(trusted_session_token),
                created_at=now.iso,
                expires_at=now.add(seconds=self.trusted_session_lifetime_seconds).iso,
            )
            trusted_token_id = trusted_token.trusted_session_token_id

        return self.start_session(
            user,
            auth_method=AUTH_METHOD_PASSWORD_EMAIL_MFA,
            ip_address=ip_address,
            mfa_verified_at=now.iso,
            trusted_session_token=trusted_session_token,
            trusted_token_id=trusted_token_id,
            user_agent=user_agent,
        )

    def resend_login_mfa(
        self,
        data: LoginMfaResendRequest,
        *,
        locale: str,
    ) -> LoginMfaChallengeDelivery:
        challenge = self._require_login_mfa_challenge(data.challenge_id)
        user = self.user_repository.select_user_by_id(user_id=challenge.user_id)
        if user is None or not user.is_active:
            raise InvalidLoginMfaChallengeError()
        return self._issue_login_mfa_challenge(
            user,
            clear_trusted_session_token=False,
            locale=locale,
        )

    def verify_email(self, token: str) -> User:
        token_hash = hash_token(token)
        user = self._require_user_token(
            token_hash=token_hash,
            purpose=USER_TOKEN_PURPOSE_EMAIL_VERIFICATION,
            error=InvalidEmailVerificationTokenError(),
        )
        updated_user = self.user_repository.update_user_status(
            user_id=user.user_id,
            status=USER_STATUS_ACTIVE,
            updated_at=UtcTime.now().iso,
        )
        self.user_repository.delete_user_token_by_hash(token_hash=token_hash)
        self._record_user_audit(
            action=AUDIT_ACTION_EMAIL_VERIFIED,
            actor_user_id=updated_user.user_id,
            entity_id=updated_user.user_id,
            after={"email": updated_user.email},
        )
        return updated_user

    def invited_staff(self, token: str) -> User:
        return self._require_user_token(
            token_hash=hash_token(token),
            purpose=USER_TOKEN_PURPOSE_STAFF_INVITATION,
            error=InvalidStaffInvitationTokenError(),
        )

    def request_password_reset(
        self,
        data: ForgotPasswordRequest,
        *,
        locale: str,
    ) -> DeliveredEmailArtifact | None:
        user = self.user_repository.select_user_by_email(email=data.email)
        if user is None or not user.is_active:
            return None

        token, expires_at = self._issue_user_token(
            user=user,
            purpose=USER_TOKEN_PURPOSE_PASSWORD_RESET,
            lifetime_seconds=self.password_reset_lifetime_seconds,
        )
        return self.email_service.send_password_reset_link(
            email=user.email,
            reset_url=self._token_url(
                "/reset-password",
                token,
                user_type=data.user_type,
            ),
            expires_at=expires_at,
            locale=locale,
        )

    def resend_verification(
        self,
        data: ResendVerificationRequest,
        *,
        locale: str,
    ) -> DeliveredEmailArtifact | None:
        user = self.user_repository.select_user_by_email(email=data.email)
        if user is None or not user.needs_email_verification:
            return None
        if data.user_type and user.user_type != data.user_type:
            return None

        return self._send_verification(user, locale=locale)

    def change_pending_email(
        self,
        data: ChangePendingEmailRequest,
        *,
        locale: str,
    ) -> VerificationDelivery:
        user = self._require_pending_user(
            email=data.current_email,
            password=data.password,
            user_type=data.user_type,
        )
        updated_user = self.user_repository.update_user_email(
            user_id=user.user_id,
            email=data.email,
            status=USER_STATUS_UNVERIFIED,
            updated_at=UtcTime.now().iso,
        )
        return VerificationDelivery(
            email=updated_user.email,
            artifact=self._send_verification(updated_user, locale=locale),
        )

    def reset_password(self, data: ResetPasswordRequest) -> None:
        token_hash = hash_token(data.token)
        user = self._require_user_token(
            token_hash=token_hash,
            purpose=USER_TOKEN_PURPOSE_PASSWORD_RESET,
            error=InvalidPasswordResetTokenError(),
        )

        password = validate_user_password(
            data.password,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
        )
        now_iso = UtcTime.now().iso
        self.user_repository.update_user_password(
            user_id=user.user_id,
            password_hash=hash_password(password),
            updated_at=now_iso,
        )
        self.user_repository.end_user_sessions_by_user_id(
            user_id=user.user_id,
            ended_at=now_iso,
            ended_reason=SESSION_ENDED_REASON_PASSWORD_RESET,
        )
        self.user_repository.delete_user_token_by_hash(token_hash=token_hash)
        self._record_user_audit(
            action=AUDIT_ACTION_PASSWORD_UPDATED,
            actor_user_id=user.user_id,
            entity_id=user.user_id,
        )

    def update_user(
        self,
        *,
        user: User,
        data: UpdateProfileRequest,
        locale: str,
    ) -> User | VerificationDelivery:
        next_email = data.email
        email_changed = next_email != user.email
        details = self._user_details(data)
        self._require_current_password(
            user,
            data.current_password,
            email_changed,
        )
        before = user.snapshot()
        profile_image_url = self._stored_media_url(data.profile_image_url)
        updated_user = self.user_repository.update_user(
            user_id=user.user_id,
            email=next_email,
            first_name=data.first_name,
            last_name=data.last_name,
            address_line_two=details.address_line_two,
            phone_number=details.phone_number,
            profile_image_url=profile_image_url,
            validated_address=details.validated_address,
            staff_id=data.staff_id or None,
            designation=data.designation or None,
            permission=(user.permission if user.user_type == USER_TYPE_STAFF else None),
            status=USER_STATUS_UNVERIFIED if email_changed else None,
            updated_at=UtcTime.now().iso,
        )
        if not email_changed:
            self._record_user_audit(
                action=AUDIT_ACTION_PROFILE_UPDATED,
                actor_user_id=user.user_id,
                after=updated_user.snapshot(),
                before=before,
                entity_id=user.user_id,
            )
            return updated_user

        self.user_repository.end_user_sessions_by_user_id(
            user_id=user.user_id,
            ended_at=UtcTime.now().iso,
            ended_reason=SESSION_ENDED_REASON_EMAIL_CHANGED,
        )
        return VerificationDelivery(
            email=updated_user.email,
            artifact=self._send_verification(updated_user, locale=locale),
        )

    def complete_staff_invitation(
        self,
        data: CompleteStaffInvitationRequest,
    ) -> User:
        user = self._require_user_token(
            token_hash=hash_token(data.token),
            purpose=USER_TOKEN_PURPOSE_STAFF_INVITATION,
            error=InvalidStaffInvitationTokenError(),
        )
        validate_user_password(
            data.password,
            email=user.email,
            first_name=data.first_name,
            last_name=data.last_name,
        )
        updated_user = self.user_repository.update_user(
            user_id=user.user_id,
            email=user.email,
            first_name=data.first_name,
            last_name=data.last_name,
            staff_id=user.staff_id,
            designation=user.designation,
            permission=user.permission,
            status=USER_STATUS_ACTIVE,
            updated_at=UtcTime.now().iso,
        )
        self.user_repository.delete_user_token_by_hash(
            token_hash=hash_token(data.token)
        )
        self._record_user_audit(
            action=AUDIT_ACTION_STAFF_REGISTRATION_COMPLETED,
            actor_user_id=updated_user.user_id,
            entity_id=updated_user.user_id,
            after={"email": updated_user.email, "status": updated_user.status},
        )
        return updated_user

    def update_managed_user(
        self,
        *,
        actor: User,
        target_user_id: bytes,
        data: AdminUpdateUserRequest,
    ) -> User:
        target = self.user_repository.select_user_by_id(user_id=target_user_id)
        if target is None:
            raise ManagedUserNotFoundError()

        self._require_manageable_target(actor=actor, target=target, for_status=False)

        if target.user_type == USER_TYPE_STAFF:
            next_permission = data.permission or STAFF_PERMISSION_ADMIN
            if permission_rank(next_permission) > permission_rank(actor.permission):
                raise UserPermissionEscalationError()
        else:
            next_permission = None

        profile_image_url = self._stored_media_url(data.profile_image_url)
        updated_user = self.user_repository.admin_update_user(
            user_id=target.user_id,
            email=data.email,
            first_name=data.first_name,
            last_name=data.last_name,
            profile_image_url=profile_image_url,
            staff_id=data.staff_id or None,
            designation=data.designation or None,
            permission=next_permission,
            updated_at=UtcTime.now().iso,
            updated_by_user_id=actor.user_id,
        )
        self._record_user_audit(
            action=AUDIT_ACTION_MANAGED_USER_UPDATED,
            actor_user_id=actor.user_id,
            entity_id=target.user_id,
            before=target.snapshot(),
            after=updated_user.snapshot(),
        )
        return updated_user

    def _stored_media_url(self, value: str) -> str:
        if not is_data_image_url(value):
            return value
        try:
            with self.user_repository.connect() as connection:
                return self.media_repository.store_data_url(
                    connection,
                    data_url=value,
                )
        except InvalidMediaDataError as error:
            raise ApiError(
                str(error),
                HTTPStatus.BAD_REQUEST,
                code="MEDIA_INVALID",
            ) from error

    def update_managed_user_status(
        self,
        *,
        actor: User,
        target_user_id: bytes,
        data: AdminSetUserStatusRequest,
    ) -> User:
        target = self.user_repository.select_user_by_id(user_id=target_user_id)
        if target is None:
            raise ManagedUserNotFoundError()

        self._require_manageable_target(actor=actor, target=target, for_status=True)

        updated_user = self.user_repository.update_user_status(
            user_id=target.user_id,
            status=data.status,
            updated_at=UtcTime.now().iso,
            updated_by_user_id=actor.user_id,
        )
        self._record_user_audit(
            action=AUDIT_ACTION_STATUS_CHANGED,
            actor_user_id=actor.user_id,
            entity_id=target.user_id,
            before=target.snapshot(),
            after=updated_user.snapshot(),
        )
        return updated_user

    def _user_details(
        self,
        data: RegisterRequest | UpdateProfileRequest,
    ) -> UserDetails:
        return build_user_details(
            address_line_two=data.address_line_two,
            phone_country=data.phone_country,
            phone_number=data.phone_number,
            validated_address=self.address_service.validate(
                address_line_one=data.address_line_one,
                address_line_two=data.address_line_two,
                suburb=data.suburb,
                state=data.state,
                postcode=data.postcode,
                country=data.country,
            ),
        )

    def start_session(
        self,
        user: User,
        *,
        auth_method: str = AUTH_METHOD_PASSWORD,
        ip_address: str | None = None,
        mfa_verified_at: str | None = None,
        trusted_session_token: str | None = None,
        trusted_token_id: bytes | None = None,
        user_agent: str | None = None,
    ) -> StartedSession:
        session_token = new_session_token()
        now = UtcTime.now()
        # Persist a hashed session token so future requests can authenticate
        # without storing the raw session value in the database.
        session = self.user_repository.insert_user_session(
            auth_method=auth_method,
            user_id=user.user_id,
            session_token_hash=hash_session_token(session_token),
            created_at=now.iso,
            expires_at=now.add(seconds=self.session_lifetime_seconds).iso,
            mfa_verified_at=mfa_verified_at,
            trusted_token_id=trusted_token_id,
        )
        with self.user_repository.connect() as connection:
            self.access_log_repository.insert_access_log(
                connection,
                event_type=ACCESS_EVENT_LOGIN,
                ip_address=ip_address,
                occurred_at=now.iso,
                session_id=session.session_id,
                user_agent=user_agent,
                user_id=user.user_id,
            )
        return StartedSession(
            session_token=session_token,
            trusted_session_token=trusted_session_token,
            user=user,
        )

    def logout(
        self,
        session_token: str | None,
        *,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        if session_token is None:
            return

        session_token_hash = hash_session_token(session_token)
        session = self.user_repository.select_session_by_token_hash(
            session_token_hash=session_token_hash,
        )
        if session is None or session.ended_at is not None:
            return

        now_iso = UtcTime.now().iso
        with self.user_repository.connect() as connection:
            self.user_repository.end_user_session(
                connection,
                ended_at=now_iso,
                ended_reason=SESSION_ENDED_REASON_LOGOUT,
                session_id=session.session_id,
            )
            self.access_log_repository.insert_access_log(
                connection,
                event_type=ACCESS_EVENT_LOGOUT,
                ip_address=ip_address,
                occurred_at=now_iso,
                session_id=session.session_id,
                user_agent=user_agent,
                user_id=session.user_id,
            )

    def list_sessions(
        self,
        *,
        user: User,
        current_session_token: str | None,
    ) -> list[UserSessionInfo]:
        return self.user_repository.list_user_sessions(
            user_id=user.user_id,
            current_session_token_hash=(
                hash_session_token(current_session_token)
                if current_session_token is not None
                else None
            ),
            now_iso=UtcTime.now().iso,
        )

    def list_admin_sessions(
        self,
        *,
        current_session_token: str | None,
    ) -> list[UserSessionInfo]:
        return self.user_repository.list_active_sessions(
            current_session_token_hash=(
                hash_session_token(current_session_token)
                if current_session_token is not None
                else None
            ),
            now_iso=UtcTime.now().iso,
        )

    def revoke_session(
        self,
        *,
        actor: User,
        current_session_token: str | None,
        ip_address: str | None = None,
        session_id: bytes,
        user_agent: str | None = None,
    ) -> None:
        current_session_token_hash = (
            hash_session_token(current_session_token)
            if current_session_token is not None
            else None
        )
        target = self.user_repository.select_active_session_for_user(
            session_id=session_id,
            user_id=actor.user_id,
            now_iso=UtcTime.now().iso,
        )
        if target is None:
            raise SessionNotFoundError()
        if target.session_token_hash == current_session_token_hash:
            raise CurrentSessionRevocationNotAllowedError()

        now_iso = UtcTime.now().iso
        with self.user_repository.connect() as connection:
            self.user_repository.end_user_session(
                connection,
                ended_at=now_iso,
                ended_reason=SESSION_ENDED_REASON_REVOKED,
                session_id=target.session_id,
            )
            self.access_log_repository.insert_access_log(
                connection,
                event_type=ACCESS_EVENT_SESSION_REVOKED,
                ip_address=ip_address,
                occurred_at=now_iso,
                session_id=target.session_id,
                user_agent=user_agent,
                user_id=actor.user_id,
            )
            self.audit.record_event(
                connection,
                action=AUDIT_ACTION_SESSION_REVOKED,
                actor_user_id=actor.user_id,
                entity_id=actor.user_id,
                entity_type=AUDIT_ENTITY_TYPE_USER,
                occurred_at=now_iso,
                after={"sessionId": target.id},
            )

    def admin_revoke_session(
        self,
        *,
        actor: User,
        current_session_token: str | None,
        ip_address: str | None = None,
        session_id: bytes,
        user_agent: str | None = None,
    ) -> None:
        current_session_token_hash = (
            hash_session_token(current_session_token)
            if current_session_token is not None
            else None
        )
        target = self.user_repository.select_active_session(
            session_id=session_id,
            now_iso=UtcTime.now().iso,
        )
        if target is None:
            raise SessionNotFoundError()
        if target.session_token_hash == current_session_token_hash:
            raise CurrentSessionRevocationNotAllowedError()

        now_iso = UtcTime.now().iso
        with self.user_repository.connect() as connection:
            self.user_repository.end_user_session(
                connection,
                ended_at=now_iso,
                ended_reason=SESSION_ENDED_REASON_REVOKED,
                session_id=target.session_id,
            )
            self.access_log_repository.insert_access_log(
                connection,
                event_type=ACCESS_EVENT_SESSION_REVOKED,
                ip_address=ip_address,
                occurred_at=now_iso,
                session_id=target.session_id,
                user_agent=user_agent,
                user_id=target.user_id,
            )
            self.audit.record_event(
                connection,
                action=AUDIT_ACTION_SESSION_REVOKED,
                actor_user_id=actor.user_id,
                entity_id=target.user_id,
                entity_type=AUDIT_ENTITY_TYPE_USER,
                occurred_at=now_iso,
                after={"sessionId": target.id},
            )

    def logout_other_sessions(
        self,
        *,
        user: User,
        current_session_token: str | None,
    ) -> int:
        current_session_token_hash = (
            hash_session_token(current_session_token)
            if current_session_token is not None
            else None
        )
        now_iso = UtcTime.now().iso
        count = 0
        with self.user_repository.connect() as connection:
            rows = connection.execute(
                """
                SELECT *
                FROM user_sessions
                WHERE user_id = ?
                  AND ended_at IS NULL
                  AND expires_at > ?
                  AND session_token_hash <> ?
                """,
                (user.user_id, now_iso, current_session_token_hash or ""),
            ).fetchall()
            for row in rows:
                count += self.user_repository.end_user_session(
                    connection,
                    ended_at=now_iso,
                    ended_reason=SESSION_ENDED_REASON_LOGOUT_OTHERS,
                    session_id=row["session_id"],
                )
                self.access_log_repository.insert_access_log(
                    connection,
                    event_type=ACCESS_EVENT_SESSION_REVOKED,
                    occurred_at=now_iso,
                    session_id=row["session_id"],
                    user_id=user.user_id,
                )
            if count:
                self.audit.record_event(
                    connection,
                    action=AUDIT_ACTION_LOGOUT_OTHERS,
                    actor_user_id=user.user_id,
                    after={"endedCount": count},
                    entity_id=user.user_id,
                    entity_type=AUDIT_ENTITY_TYPE_USER,
                    occurred_at=now_iso,
                )
        return count

    def mfa_settings(self, *, user: User) -> UserMfaSettings:
        settings = self.user_repository.select_mfa_settings(user_id=user.user_id)
        if settings is not None:
            return settings
        return self.user_repository.upsert_mfa_settings(
            user_id=user.user_id,
            email_enabled=False,
            updated_at=UtcTime.now().iso,
        )

    def update_mfa_settings(
        self,
        *,
        user: User,
        data: UpdateMfaSettingsRequest,
    ) -> UserMfaSettings:
        before = self.mfa_settings(user=user)
        now_iso = UtcTime.now().iso
        settings = self.user_repository.upsert_mfa_settings(
            user_id=user.user_id,
            email_enabled=data.email_enabled,
            updated_at=now_iso,
        )
        self._record_user_audit(
            action=AUDIT_ACTION_MFA_SETTINGS_UPDATED,
            actor_user_id=user.user_id,
            entity_id=user.user_id,
            before={"emailEnabled": before.email_enabled},
            after={"emailEnabled": settings.email_enabled},
        )
        return settings

    def _send_verification(
        self,
        user: User,
        *,
        locale: str,
    ) -> DeliveredEmailArtifact:
        token, expires_at = self._issue_user_token(
            user=user,
            purpose=USER_TOKEN_PURPOSE_EMAIL_VERIFICATION,
            lifetime_seconds=self.verification_lifetime_seconds,
        )
        return self.email_service.send_verification_link(
            email=user.email,
            verification_url=self._token_url("/verify-email", token),
            expires_at=expires_at,
            locale=locale,
        )

    def _send_staff_invitation(
        self,
        user: User,
        *,
        locale: str,
    ) -> DeliveredEmailArtifact:
        token, expires_at = self._issue_user_token(
            user=user,
            purpose=USER_TOKEN_PURPOSE_STAFF_INVITATION,
            lifetime_seconds=self.verification_lifetime_seconds,
        )
        return self.email_service.send_staff_invitation_link(
            email=user.email,
            registration_url=self._token_url(
                "/staff-register",
                token,
                user_type=USER_TYPE_STAFF,
            ),
            expires_at=expires_at,
            locale=locale,
        )

    def _issue_user_token(
        self,
        *,
        user: User,
        purpose: str,
        lifetime_seconds: int,
    ) -> tuple[str, str]:
        token = new_token()
        now = UtcTime.now()
        expires_at = now.add(seconds=lifetime_seconds).iso
        self.user_repository.delete_user_tokens_by_user_id_and_purpose(
            user_id=user.user_id,
            purpose=purpose,
        )
        self.user_repository.upsert_user_token(
            user_id=user.user_id,
            purpose=purpose,
            token_hash=hash_token(token),
            created_at=now.iso,
            expires_at=expires_at,
        )
        return token, expires_at

    def _issue_login_mfa_challenge(
        self,
        user: User,
        *,
        clear_trusted_session_token: bool,
        locale: str,
    ) -> LoginMfaChallengeDelivery:
        code = f"{secrets.randbelow(1_000_000):06d}"
        now = UtcTime.now()
        challenge = self.user_repository.insert_auth_challenge(
            user_id=user.user_id,
            purpose=AUTH_CHALLENGE_PURPOSE_LOGIN_EMAIL_MFA,
            delivery_email=user.email,
            code_hash=hash_token(code),
            requested_trust=True,
            created_at=now.iso,
            expires_at=now.add(seconds=self.login_mfa_lifetime_seconds).iso,
        )
        return LoginMfaChallengeDelivery(
            artifact=self.email_service.send_login_mfa_code(
                code=code,
                email=user.email,
                expires_at=challenge.expires_at,
                locale=locale,
            ),
            challenge=challenge,
            clear_trusted_session_token=clear_trusted_session_token,
        )

    def _require_login_mfa_challenge(self, challenge_id: str) -> AuthChallenge:
        try:
            auth_challenge_id = UUID(challenge_id).bytes
        except ValueError as error:
            raise InvalidLoginMfaChallengeError() from error

        challenge = self.user_repository.select_auth_challenge(
            auth_challenge_id=auth_challenge_id,
            purpose=AUTH_CHALLENGE_PURPOSE_LOGIN_EMAIL_MFA,
            now_iso=UtcTime.now().iso,
        )
        if challenge is None:
            raise InvalidLoginMfaChallengeError()
        return challenge

    def _record_user_audit(
        self,
        *,
        action: str,
        entity_id: bytes,
        actor_user_id: bytes | None = None,
        before: dict[str, object] | None = None,
        after: dict[str, object] | None = None,
    ) -> None:
        with self.user_repository.connect() as connection:
            self.audit.record_event(
                connection,
                action=action,
                actor_user_id=actor_user_id,
                after=after,
                before=before,
                entity_id=entity_id,
                entity_type=AUDIT_ENTITY_TYPE_USER,
                occurred_at=UtcTime.now().iso,
            )

    def _token_url(
        self,
        path: str,
        token: str,
        *,
        user_type: str = "",
    ) -> str:
        query = {"token": token}

        if user_type:
            query["userType"] = user_type

        return f"{self.web_url.rstrip('/')}{path}?{urlencode(query)}"

    def _require_user_token(
        self,
        *,
        token_hash: str,
        purpose: str,
        error: ApiError,
    ) -> User:
        user = self.user_repository.select_user_by_token_hash(
            token_hash=token_hash,
            purpose=purpose,
            now_iso=UtcTime.now().iso,
        )
        if user is None:
            raise error
        return user

    def _require_current_password(
        self,
        user: User,
        current_password: str | None,
        required: bool,
    ) -> None:
        if not required:
            return
        if not current_password:
            raise CurrentPasswordRequiredError()
        if not verify_password(current_password, user.password_hash):
            raise CurrentPasswordIncorrectError()

    def _require_pending_user(
        self,
        *,
        email: str,
        password: str,
        user_type: str = "",
    ) -> User:
        user = self.user_repository.select_user_by_email(email=email)
        if user is None or not verify_password(password, user.password_hash):
            raise AuthenticationError()
        if not user.needs_email_verification:
            raise PendingVerificationRequiredError()
        if user_type and user.user_type != user_type:
            raise StaffAccountRequiredError()
        return user

    def _require_manageable_target(
        self,
        *,
        actor: User,
        target: User,
        for_status: bool,
    ) -> None:
        if actor.user_id == target.user_id:
            raise UserManagementNotAllowedError()
        if target.user_type != USER_TYPE_STAFF:
            return

        actor_rank = permission_rank(actor.permission)
        target_rank = permission_rank(target.permission)

        if target_rank > actor_rank:
            raise UserManagementNotAllowedError()
        if for_status and target_rank >= actor_rank:
            raise UserManagementNotAllowedError()
