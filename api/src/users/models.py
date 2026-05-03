from dataclasses import dataclass, field

from src.addresses.models import ValidatedAddress
from src.common.sqlite_model import (
    ApiModel,
    BlobUuidModel,
    SqliteRowModel,
    id_bytes_to_string,
    new_id_bytes,
)
from src.common.types import (
    Designation,
    EmailAddress,
    FirstName,
    LastName,
    PasswordText,
    PermissionValue,
    StaffId,
)
from src.common.validation import (
    PASSWORD_MAX_LENGTH,
    PHONE_NUMBER_MAX_LENGTH,
    ChoiceValidator,
    PhoneCountryValidator,
    PhoneValidator,
    StringValidator,
)

USER_TYPE_CUSTOMER = "customer"
USER_TYPE_STAFF = "staff"
STAFF_PERMISSION_ADMIN = "admin"
STAFF_PERMISSION_SUPERADMIN = "superadmin"

USER_STATUS_UNVERIFIED = "unverified"
USER_STATUS_ACTIVE = "active"
# Disabled users remain stored in the database, but auth checks should treat
# them as inactive so the account can no longer be used to sign in.
USER_STATUS_DISABLED = "disabled"

USER_TOKEN_PURPOSE_EMAIL_VERIFICATION = "email_verification"
USER_TOKEN_PURPOSE_PASSWORD_RESET = "password_reset"
USER_TOKEN_PURPOSE_STAFF_INVITATION = "staff_invitation"
ENTITY_TYPE_USER = "user"
AUTH_METHOD_PASSWORD = "password"
AUTH_METHOD_PASSWORD_EMAIL_MFA = "password_email_mfa"
AUTH_METHOD_TRUSTED_BROWSER = "trusted_browser"
SESSION_ENDED_REASON_EMAIL_CHANGED = "email_changed"
SESSION_ENDED_REASON_LOGOUT = "logout"
SESSION_ENDED_REASON_LOGOUT_OTHERS = "logout_others"
SESSION_ENDED_REASON_PASSWORD_RESET = "password_reset"
SESSION_ENDED_REASON_REVOKED = "revoked"
AUTH_CHALLENGE_PURPOSE_LOGIN_EMAIL_MFA = "login_email_mfa"
EMAIL_VALIDATOR = EmailAddress.VALIDATOR
FIRST_NAME_VALIDATOR = FirstName.VALIDATOR
LAST_NAME_VALIDATOR = LastName.VALIDATOR
PASSWORD_INPUT_VALIDATOR = StringValidator(
    field_name="password",
    required=True,
    max_length=PASSWORD_MAX_LENGTH,
    ascii_only=True,
    printable_ascii_only=True,
)
CURRENT_PASSWORD_VALIDATOR = StringValidator(
    field_name="currentPassword",
    required=True,
    max_length=PASSWORD_MAX_LENGTH,
    ascii_only=True,
    printable_ascii_only=True,
)
PASSWORD_VALIDATOR = PasswordText.DOMAIN_VALIDATOR
PHONE_NUMBER_VALIDATOR = StringValidator(
    field_name="phoneNumber",
    max_length=PHONE_NUMBER_MAX_LENGTH,
)
PHONE_COUNTRY_VALIDATOR = PhoneCountryValidator(
    field_name="phoneCountry",
    ascii_only=True,
    uppercase=True,
)
DOMAIN_PHONE_NUMBER_VALIDATOR = PhoneValidator(
    field_name="phone number",
    max_length=PHONE_NUMBER_MAX_LENGTH,
    ascii_only=True,
    printable_ascii_only=True,
)
DESIGNATION_VALIDATOR = Designation.VALIDATOR
STAFF_ID_VALIDATOR = StaffId.VALIDATOR
PERMISSION_VALIDATOR = PermissionValue.VALIDATOR
USER_TYPE_VALIDATOR = ChoiceValidator(
    field_name="userType",
    choices=(USER_TYPE_CUSTOMER, USER_TYPE_STAFF),
)
USER_STATUS_VALIDATOR = ChoiceValidator(
    field_name="status",
    choices=(USER_STATUS_ACTIVE, USER_STATUS_DISABLED),
)


def _user_name(first_name: str | None, last_name: str | None) -> str | None:
    parts = [part for part in (first_name, last_name) if part]
    return " ".join(parts) if parts else None


@dataclass(slots=True, frozen=True)
class User(SqliteRowModel, BlobUuidModel, ApiModel):
    public_fields = (
        "id",
        "email",
        "first_name",
        "last_name",
        "user_type",
        "status",
        "phone_number",
        "address_label",
        "address_line_one",
        "address_line_two",
        "suburb",
        "state",
        "postcode",
        "country",
        "staff_id",
        "designation",
        "permission",
    )

    email: str
    password_hash: str
    first_name: str
    last_name: str
    user_type: str
    status: str
    created_at: str
    updated_at: str
    phone_number: str | None = None
    address_label: str | None = None
    address_line_one: str | None = None
    address_line_two: str | None = None
    suburb: str | None = None
    state: str | None = None
    postcode: str | None = None
    country: str | None = None
    staff_id: str | None = None
    designation: str | None = None
    permission: str | None = None
    user_id: bytes = field(default_factory=new_id_bytes)

    @property
    def is_active(self) -> bool:
        return self.status == USER_STATUS_ACTIVE

    @property
    def needs_email_verification(self) -> bool:
        return self.status == USER_STATUS_UNVERIFIED

    @property
    def is_staff(self) -> bool:
        return self.user_type == USER_TYPE_STAFF

    @property
    def is_admin(self) -> bool:
        return self.permission in (
            STAFF_PERMISSION_ADMIN,
            STAFF_PERMISSION_SUPERADMIN,
        )

    def snapshot(self) -> dict[str, object]:
        return {
            "designation": self.designation,
            "email": self.email,
            "firstName": self.first_name,
            "lastName": self.last_name,
            "permission": self.permission,
            "staffId": self.staff_id,
            "status": self.status,
            "userType": self.user_type,
        }


@dataclass(slots=True, frozen=True)
class UserSession(SqliteRowModel, BlobUuidModel):
    user_id: bytes
    session_token_hash: str
    created_at: str
    expires_at: str
    ended_at: str | None = None
    ended_reason: str | None = None
    last_seen_at: str | None = None
    mfa_verified_at: str | None = None
    trusted_token_id: bytes | None = None
    auth_method: str = AUTH_METHOD_PASSWORD
    session_id: bytes = field(default_factory=new_id_bytes)

    @classmethod
    def uuid_field_name(cls) -> str:
        return "session_id"


@dataclass(slots=True, frozen=True)
class UserSessionInfo(SqliteRowModel, BlobUuidModel):
    user_id: bytes
    session_token_hash: str
    created_at: str
    expires_at: str
    ended_at: str | None = None
    ended_reason: str | None = None
    last_seen_at: str | None = None
    mfa_verified_at: str | None = None
    trusted_token_id: bytes | None = None
    trusted_expires_at: str | None = None
    auth_method: str = AUTH_METHOD_PASSWORD
    latest_access_at: str | None = None
    latest_event_type: str | None = None
    latest_ip_address: str | None = None
    latest_user_agent: str | None = None
    is_current: bool = False
    user_email: str | None = None
    user_first_name: str | None = None
    user_last_name: str | None = None
    session_id: bytes = field(default_factory=new_id_bytes)

    @classmethod
    def uuid_field_name(cls) -> str:
        return "session_id"

    def to_dict(self) -> dict[str, object]:
        from src.access_logs.models import device_label_for_user_agent

        return {
            "authMethod": self.auth_method,
            "createdAt": self.created_at,
            "deviceLabel": device_label_for_user_agent(self.latest_user_agent),
            "endedAt": self.ended_at,
            "endedReason": self.ended_reason,
            "expiresAt": self.expires_at,
            "id": id_bytes_to_string(self.session_id),
            "isCurrent": bool(self.is_current),
            "isTrusted": self.trusted_token_id is not None,
            "lastSeenAt": self.last_seen_at or self.created_at,
            "latestEventType": self.latest_event_type,
            "latestIpAddress": self.latest_ip_address,
            "latestUserAgent": self.latest_user_agent,
            "mfaVerifiedAt": self.mfa_verified_at,
            "trustedExpiresAt": self.trusted_expires_at,
            "userEmail": self.user_email,
            "userId": id_bytes_to_string(self.user_id),
            "userName": _user_name(self.user_first_name, self.user_last_name),
        }


@dataclass(slots=True, frozen=True)
class UserToken(SqliteRowModel, BlobUuidModel):
    user_id: bytes
    purpose: str
    token_hash: str
    created_at: str
    expires_at: str
    user_token_id: bytes = field(default_factory=new_id_bytes)


@dataclass(slots=True, frozen=True)
class TrustedSessionToken(SqliteRowModel, BlobUuidModel):
    user_id: bytes
    token_hash: str
    created_at: str
    last_used_at: str
    expires_at: str
    revoked_at: str | None = None
    revoked_reason: str | None = None
    trusted_session_token_id: bytes = field(default_factory=new_id_bytes)

    @classmethod
    def uuid_field_name(cls) -> str:
        return "trusted_session_token_id"


@dataclass(slots=True, frozen=True)
class UserMfaSettings(SqliteRowModel, ApiModel):
    public_fields = (
        "email_enabled",
        "created_at",
        "enabled_at",
        "updated_at",
    )

    user_id: bytes
    email_enabled: bool
    created_at: str
    updated_at: str
    enabled_at: str | None = None


@dataclass(slots=True, frozen=True)
class AuthChallenge(SqliteRowModel, BlobUuidModel):
    user_id: bytes
    purpose: str
    delivery_email: str
    code_hash: str
    requested_trust: bool
    created_at: str
    last_sent_at: str
    expires_at: str
    completed_at: str | None = None
    invalidated_at: str | None = None
    attempt_count: int = 0
    auth_challenge_id: bytes = field(default_factory=new_id_bytes)

    @classmethod
    def uuid_field_name(cls) -> str:
        return "auth_challenge_id"


@dataclass(slots=True, frozen=True)
class UserDetails:
    address_line_two: str | None
    phone_number: str | None
    validated_address: ValidatedAddress | None


def validate_user_password(
    value: str,
    *,
    email: str,
    first_name: str,
    last_name: str,
) -> str:
    return PASSWORD_VALIDATOR.validate_domain(
        value,
        email=email,
        first_name=first_name,
        last_name=last_name,
    )


def normalise_phone_number(
    phone_number: str | None,
    *,
    phone_country: str | None = None,
) -> str | None:
    if phone_number is None:
        return None

    return (
        DOMAIN_PHONE_NUMBER_VALIDATOR.validate_domain(
            phone_number,
            phone_country=phone_country,
        )
        or None
    )


def build_user_details(
    *,
    address_line_two: str,
    phone_country: str,
    phone_number: str,
    validated_address: ValidatedAddress | None,
) -> UserDetails:
    return UserDetails(
        address_line_two=address_line_two or None,
        phone_number=normalise_phone_number(
            phone_number,
            phone_country=phone_country,
        ),
        validated_address=validated_address,
    )


def permission_rank(permission: str | None) -> int:
    if permission == STAFF_PERMISSION_SUPERADMIN:
        return 2
    if permission == STAFF_PERMISSION_ADMIN:
        return 1
    return 0


def user_has_changes(
    user: User,
    *,
    email: str,
    first_name: str,
    last_name: str,
    designation: str,
    staff_id: str,
    permission: str,
    details: UserDetails,
) -> bool:
    if (
        email != user.email
        or first_name != user.first_name
        or last_name != user.last_name
    ):
        return True

    if user.user_type == USER_TYPE_CUSTOMER:
        next_address = details.validated_address
        return any(
            (
                (details.phone_number or None) != (user.phone_number or None),
                (details.address_line_two or None) != (user.address_line_two or None),
                (next_address.address_line_one if next_address else None)
                != (user.address_line_one or None),
                (next_address.suburb if next_address else None)
                != (user.suburb or None),
                (next_address.state if next_address else None) != (user.state or None),
                (next_address.postcode if next_address else None)
                != (user.postcode or None),
                (next_address.country if next_address else None)
                != (user.country or None),
            )
        )

    return any(
        (
            (staff_id or None) != (user.staff_id or None),
            (designation or None) != (user.designation or None),
            (permission or None) != (user.permission or None),
        )
    )
