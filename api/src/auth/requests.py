from typing import Annotated

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
from src.common.validation import (
    TOKEN_MAX_LENGTH,
    StringValidator,
    TokenValidator,
)
from src.users.models import (
    CURRENT_PASSWORD_VALIDATOR,
    DESIGNATION_VALIDATOR,
    EMAIL_VALIDATOR,
    FIRST_NAME_VALIDATOR,
    LAST_NAME_VALIDATOR,
    PASSWORD_INPUT_VALIDATOR,
    PERMISSION_VALIDATOR,
    PHONE_COUNTRY_VALIDATOR,
    PHONE_NUMBER_VALIDATOR,
    STAFF_ID_VALIDATOR,
    USER_TYPE_VALIDATOR,
)

TOKEN_VALIDATOR = TokenValidator(
    field_name="token",
    required=True,
    max_length=TOKEN_MAX_LENGTH,
    ascii_only=True,
    printable_ascii_only=True,
)


def _optional_request_validator(validator: StringValidator):
    def validate(value: str) -> str:
        return value if not value else validator.validate_request(value)

    return validate


EmailValue = Annotated[str, AfterValidator(EMAIL_VALIDATOR.validate_request)]
FirstNameValue = Annotated[str, AfterValidator(FIRST_NAME_VALIDATOR.validate_request)]
LastNameValue = Annotated[str, AfterValidator(LAST_NAME_VALIDATOR.validate_request)]
PasswordValue = Annotated[
    str,
    AfterValidator(PASSWORD_INPUT_VALIDATOR.validate_request),
]
CurrentPasswordValue = Annotated[
    str,
    AfterValidator(_optional_request_validator(CURRENT_PASSWORD_VALIDATOR)),
]
TokenValue = Annotated[str, AfterValidator(TOKEN_VALIDATOR.validate_request)]
UserTypeValue = Annotated[
    str,
    AfterValidator(_optional_request_validator(USER_TYPE_VALIDATOR)),
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
    staff_id: StaffIdValue = ""
    designation: DesignationValue = ""
    permission: PermissionValue = ""


class InviteStaffRequest(AuthRequest):
    email: EmailValue
    staff_id: StaffIdValue
    designation: DesignationValue
    permission: PermissionValue = ""


class CompleteStaffInvitationRequest(AuthRequest):
    first_name: FirstNameValue
    last_name: LastNameValue
    password: PasswordValue
    token: TokenValue
