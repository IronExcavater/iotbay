from typing import Annotated
from uuid import UUID

from pydantic import AfterValidator, BaseModel, ConfigDict, model_validator
from pydantic.alias_generators import to_camel
from src.addresses.models import (
    ADDRESS_LINE_ONE_VALIDATOR,
    ADDRESS_LINE_TWO_VALIDATOR,
    COUNTRY_VALIDATOR,
    POSTCODE_VALIDATOR,
    STATE_VALIDATOR,
    SUBURB_VALIDATOR,
    validate_address_fields,
)
from src.common.types import EmailAddress, FirstName, LastName
from src.common.validation import (
    TOKEN_MAX_LENGTH,
    StringValidator,
    TokenValidator,
)
from src.users.models import (
    CURRENT_PASSWORD_VALIDATOR,
    DESIGNATION_VALIDATOR,
    PASSWORD_INPUT_VALIDATOR,
    PERMISSION_VALIDATOR,
    PHONE_COUNTRY_VALIDATOR,
    PHONE_NUMBER_VALIDATOR,
    PROFILE_IMAGE_URL_VALIDATOR,
    STAFF_ID_VALIDATOR,
    USER_STATUS_VALIDATOR,
    USER_TYPE_VALIDATOR,
)

TOKEN_VALIDATOR = TokenValidator(
    field_name="token",
    required=True,
    max_length=TOKEN_MAX_LENGTH,
    ascii_only=True,
    printable_ascii_only=True,
)
AUTH_CHALLENGE_ID_VALIDATOR = StringValidator(
    field_name="challengeId",
    required=True,
    max_length=36,
    ascii_only=True,
    printable_ascii_only=True,
)
MFA_CODE_VALIDATOR = StringValidator(
    field_name="code",
    required=True,
    max_length=6,
    ascii_only=True,
    printable_ascii_only=True,
)


def _optional_request_validator(validator: StringValidator):
    def validate(value: str) -> str:
        return value if not value else validator.validate_request(value)

    return validate


def _uuid_value(field_name: str):
    def validate(value: str) -> str:
        normalized = value.strip()
        try:
            UUID(normalized)
        except ValueError as error:
            raise ValueError(f"{field_name} is invalid") from error
        return normalized

    return validate


def _mfa_code_value(value: str) -> str:
    normalized = MFA_CODE_VALIDATOR.validate_request(value)
    if not normalized.isdigit():
        raise ValueError("code must contain digits only")
    return normalized


EmailValue = Annotated[str, AfterValidator(EmailAddress.validate_request)]
FirstNameValue = Annotated[str, AfterValidator(FirstName.validate_request)]
LastNameValue = Annotated[str, AfterValidator(LastName.validate_request)]
PasswordValue = Annotated[
    str,
    AfterValidator(PASSWORD_INPUT_VALIDATOR.validate_request),
]
CurrentPasswordValue = Annotated[
    str,
    AfterValidator(_optional_request_validator(CURRENT_PASSWORD_VALIDATOR)),
]
TokenValue = Annotated[str, AfterValidator(TOKEN_VALIDATOR.validate_request)]
AuthChallengeIdValue = Annotated[
    str,
    AfterValidator(AUTH_CHALLENGE_ID_VALIDATOR.validate_request),
    AfterValidator(_uuid_value("challengeId")),
]
MfaCodeValue = Annotated[str, AfterValidator(_mfa_code_value)]
UserTypeValue = Annotated[
    str,
    AfterValidator(_optional_request_validator(USER_TYPE_VALIDATOR)),
]
UserStatusValue = Annotated[
    str,
    AfterValidator(_optional_request_validator(USER_STATUS_VALIDATOR)),
]
PhoneNumberValue = Annotated[
    str,
    AfterValidator(_optional_request_validator(PHONE_NUMBER_VALIDATOR)),
]
PhoneCountryValue = Annotated[
    str,
    AfterValidator(_optional_request_validator(PHONE_COUNTRY_VALIDATOR)),
]
AddressLineOneValue = Annotated[
    str,
    AfterValidator(_optional_request_validator(ADDRESS_LINE_ONE_VALIDATOR)),
]
AddressLineTwoValue = Annotated[
    str,
    AfterValidator(_optional_request_validator(ADDRESS_LINE_TWO_VALIDATOR)),
]
SuburbValue = Annotated[
    str,
    AfterValidator(_optional_request_validator(SUBURB_VALIDATOR)),
]
StateValue = Annotated[
    str,
    AfterValidator(_optional_request_validator(STATE_VALIDATOR)),
]
PostcodeValue = Annotated[
    str,
    AfterValidator(_optional_request_validator(POSTCODE_VALIDATOR)),
]
CountryValue = Annotated[
    str,
    AfterValidator(_optional_request_validator(COUNTRY_VALIDATOR)),
]
DesignationValue = Annotated[
    str,
    AfterValidator(_optional_request_validator(DESIGNATION_VALIDATOR)),
]
StaffIdValue = Annotated[
    str,
    AfterValidator(_optional_request_validator(STAFF_ID_VALIDATOR)),
]
PermissionValue = Annotated[
    str,
    AfterValidator(_optional_request_validator(PERMISSION_VALIDATOR)),
]
ProfileImageUrlValue = Annotated[
    str,
    AfterValidator(_optional_request_validator(PROFILE_IMAGE_URL_VALIDATOR)),
]


class AuthRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        str_strip_whitespace=True,
    )


class ProfileRequest(AuthRequest):
    first_name: FirstNameValue
    last_name: LastNameValue
    phone_number: PhoneNumberValue = ""
    phone_country: PhoneCountryValue = ""
    address_line_one: AddressLineOneValue = ""
    address_line_two: AddressLineTwoValue = ""
    suburb: SuburbValue = ""
    state: StateValue = ""
    postcode: PostcodeValue = ""
    country: CountryValue = ""

    @model_validator(mode="after")
    def validate_address_fields(self) -> "ProfileRequest":
        return validate_address_fields(self)


class RegisterRequest(ProfileRequest):
    email: EmailValue
    password: PasswordValue


class LoginRequest(AuthRequest):
    email: EmailValue
    password: PasswordValue
    user_type: UserTypeValue = ""


class ForgotPasswordRequest(AuthRequest):
    email: EmailValue
    user_type: UserTypeValue = ""


class ResendVerificationRequest(AuthRequest):
    email: EmailValue
    user_type: UserTypeValue = ""


class ResetPasswordRequest(AuthRequest):
    password: PasswordValue
    token: TokenValue


class VerifyEmailRequest(AuthRequest):
    token: TokenValue


class ChangePendingEmailRequest(AuthRequest):
    current_email: EmailValue
    email: EmailValue
    password: PasswordValue
    user_type: UserTypeValue = ""


class UpdateProfileRequest(ProfileRequest):
    email: EmailValue
    current_password: CurrentPasswordValue = ""
    profile_image_url: ProfileImageUrlValue = ""
    staff_id: StaffIdValue = ""
    designation: DesignationValue = ""
    permission: PermissionValue = ""


class InviteStaffRequest(AuthRequest):
    email: EmailValue
    staff_id: StaffIdValue
    designation: DesignationValue
    permission: PermissionValue = ""


class AdminUpdateUserRequest(AuthRequest):
    email: EmailValue
    first_name: FirstNameValue
    last_name: LastNameValue
    profile_image_url: ProfileImageUrlValue = ""
    staff_id: StaffIdValue = ""
    designation: DesignationValue = ""
    permission: PermissionValue = ""


class AdminSetUserStatusRequest(AuthRequest):
    status: UserStatusValue


class CompleteStaffInvitationRequest(AuthRequest):
    first_name: FirstNameValue
    last_name: LastNameValue
    password: PasswordValue
    token: TokenValue


class LoginMfaVerifyRequest(AuthRequest):
    challenge_id: AuthChallengeIdValue
    code: MfaCodeValue
    trust_browser: bool = False


class LoginMfaResendRequest(AuthRequest):
    challenge_id: AuthChallengeIdValue


class UpdateMfaSettingsRequest(AuthRequest):
    email_enabled: bool
