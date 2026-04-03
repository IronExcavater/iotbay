from dataclasses import dataclass, field

from src.addresses.models import ValidatedAddress
from src.common.sqlite_model import (
    ApiModel,
    BlobUuidModel,
    SqliteRowModel,
    new_id_bytes,
)
from src.common.validation import (
    EMAIL_MAX_LENGTH,
    PASSWORD_MAX_LENGTH,
    PHONE_NUMBER_MAX_LENGTH,
    ChoiceValidator,
    EmailValidator,
    NameValidator,
    PasswordValidator,
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
USER_STATUS_DISABLED = "disabled"

USER_TOKEN_PURPOSE_EMAIL_VERIFICATION = "email_verification"
USER_TOKEN_PURPOSE_PASSWORD_RESET = "password_reset"
ENTITY_TYPE_USER = "user"
NAME_MAX_LENGTH = 100
STAFF_DESIGNATION_MAX_LENGTH = 100

EMAIL_VALIDATOR = EmailValidator(
    field_name="email",
    required=True,
    max_length=EMAIL_MAX_LENGTH,
    ascii_only=True,
    printable_ascii_only=True,
    lowercase=True,
)
FIRST_NAME_VALIDATOR = NameValidator(
    field_name="firstName",
    required=True,
    max_length=NAME_MAX_LENGTH,
    ascii_only=True,
    printable_ascii_only=True,
)
LAST_NAME_VALIDATOR = NameValidator(
    field_name="lastName",
    required=True,
    max_length=NAME_MAX_LENGTH,
    ascii_only=True,
    printable_ascii_only=True,
)
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
PASSWORD_VALIDATOR = PasswordValidator(
    field_name="password",
    required=True,
    max_length=PASSWORD_MAX_LENGTH,
    ascii_only=True,
    printable_ascii_only=True,
)
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
DESIGNATION_VALIDATOR = StringValidator(
    field_name="designation",
    max_length=STAFF_DESIGNATION_MAX_LENGTH,
    ascii_only=True,
    printable_ascii_only=True,
)
PERMISSION_VALIDATOR = ChoiceValidator(
    field_name="permission",
    choices=(STAFF_PERMISSION_ADMIN, STAFF_PERMISSION_SUPERADMIN),
)
USER_TYPE_VALIDATOR = ChoiceValidator(
    field_name="userType",
    choices=(USER_TYPE_STAFF,),
)


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


@dataclass(slots=True, frozen=True)
class UserSession(SqliteRowModel, BlobUuidModel):
    user_id: bytes
    session_token_hash: str
    created_at: str
    expires_at: str
    session_id: bytes = field(default_factory=new_id_bytes)


@dataclass(slots=True, frozen=True)
class UserToken(SqliteRowModel, BlobUuidModel):
    user_id: bytes
    purpose: str
    token_hash: str
    created_at: str
    expires_at: str
    user_token_id: bytes = field(default_factory=new_id_bytes)


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


def user_has_changes(
    user: User,
    *,
    email: str,
    first_name: str,
    last_name: str,
    designation: str,
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
            (designation or None) != (user.designation or None),
            (permission or None) != (user.permission or None),
        )
    )
