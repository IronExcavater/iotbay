from dataclasses import dataclass
from http import HTTPStatus
from urllib.parse import urlencode

from src.addresses.service import AddressService
from src.auth.requests import (
    ChangePendingEmailRequest,
    CompleteStaffInvitationRequest,
    ForgotPasswordRequest,
    InviteStaffRequest,
    LoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
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
from src.users.models import (
    USER_STATUS_ACTIVE,
    USER_STATUS_UNVERIFIED,
    USER_TOKEN_PURPOSE_EMAIL_VERIFICATION,
    USER_TOKEN_PURPOSE_PASSWORD_RESET,
    USER_TOKEN_PURPOSE_STAFF_INVITATION,
    USER_TYPE_CUSTOMER,
    USER_TYPE_STAFF,
    User,
    UserDetails,
    build_user_details,
    user_has_changes,
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


@dataclass(slots=True, frozen=True)
class VerificationDelivery:
    email: str
    artifact: DeliveredEmailArtifact


@dataclass(slots=True)
class AuthService:
    address_service: AddressService
    email_service: EmailService
    password_reset_lifetime_seconds: int
    session_lifetime_seconds: int
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
            raise StaffAccountRequiredError()
        return user

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
        self.user_repository.delete_user_sessions_by_user_id(user_id=user.user_id)
        self.user_repository.delete_user_token_by_hash(token_hash=token_hash)

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
            user_has_changes(
                user,
                email=data.email,
                first_name=data.first_name,
                last_name=data.last_name,
                staff_id=data.staff_id,
                designation=data.designation,
                permission=data.permission,
                details=details,
            ),
        )
        updated_user = self.user_repository.update_user(
            user_id=user.user_id,
            email=next_email,
            first_name=data.first_name,
            last_name=data.last_name,
            address_line_two=details.address_line_two,
            phone_number=details.phone_number,
            validated_address=details.validated_address,
            staff_id=data.staff_id or None,
            designation=data.designation or None,
            permission=data.permission or None,
            status=USER_STATUS_UNVERIFIED if email_changed else None,
            updated_at=UtcTime.now().iso,
        )
        if not email_changed:
            return updated_user

        self.user_repository.delete_user_sessions_by_user_id(user_id=user.user_id)
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

    def start_session(self, user: User) -> str:
        session_token = new_session_token()
        now = UtcTime.now()
        # Persist a hashed session token so future requests can authenticate
        # without storing the raw session value in the database.
        self.user_repository.insert_user_session(
            user_id=user.user_id,
            session_token_hash=hash_session_token(session_token),
            created_at=now.iso,
            expires_at=now.add(seconds=self.session_lifetime_seconds).iso,
        )
        return session_token

    def logout(self, session_token: str | None) -> None:
        if session_token is None:
            return

        # Logout deletes the matching stored session so the current cookie can
        # no longer be used to load an authenticated user.
        self.user_repository.delete_user_session_by_token_hash(
            session_token_hash=hash_session_token(session_token)
        )

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

    def _token_url(self, path: str, token: str, *, user_type: str = "") -> str:
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
