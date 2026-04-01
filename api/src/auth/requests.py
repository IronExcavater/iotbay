from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel

EMAIL_MAX_LENGTH = 320
NAME_MAX_LENGTH = 100
PASSWORD_MAX_LENGTH = 200
TOKEN_MAX_LENGTH = 512


class AuthRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        str_strip_whitespace=True,
    )


def _validate_email(value: str) -> str:
    if len(value) > EMAIL_MAX_LENGTH:
        raise ValueError("email must be 320 characters or fewer")

    local_part, separator, domain = value.partition("@")
    is_valid = local_part and separator and "." in domain and domain.strip(".")
    if not is_valid:
        raise ValueError("email must be valid")
    return value.lower()


def _require_value(value: str, message: str) -> str:
    if not value:
        raise ValueError(message)
    return value


def _validate_name(value: str, *, field_name: str) -> str:
    value = _require_value(value, f"{field_name} is required")
    if len(value) > NAME_MAX_LENGTH:
        raise ValueError(f"{field_name} must be 100 characters or fewer")
    return value


def _validate_password(value: str) -> str:
    value = _require_value(value, "password is required")
    # Bound the raw password input so request validation stays cheap and
    # attackers cannot send arbitrarily large payloads into hashing.
    if len(value) > PASSWORD_MAX_LENGTH:
        raise ValueError("password must be 200 characters or fewer")
    return value


def _validate_token(value: str) -> str:
    value = _require_value(value, "token is required")
    if len(value) > TOKEN_MAX_LENGTH:
        raise ValueError("token is too long")
    return value


class RegisterRequest(AuthRequest):
    email: str
    password: str
    first_name: str
    last_name: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _validate_email(value)

    @field_validator("password")
    @classmethod
    def require_password(cls, value: str) -> str:
        return _validate_password(value)

    @field_validator("first_name")
    @classmethod
    def require_first_name(cls, value: str) -> str:
        return _validate_name(value, field_name="firstName")

    @field_validator("last_name")
    @classmethod
    def require_last_name(cls, value: str) -> str:
        return _validate_name(value, field_name="lastName")


class LoginRequest(AuthRequest):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _validate_email(value)

    @field_validator("password")
    @classmethod
    def require_password(cls, value: str) -> str:
        return _validate_password(value)


class ForgotPasswordRequest(AuthRequest):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _validate_email(value)


class ResetPasswordRequest(AuthRequest):
    password: str
    token: str

    @field_validator("password")
    @classmethod
    def require_password(cls, value: str) -> str:
        return _validate_password(value)

    @field_validator("token")
    @classmethod
    def require_token(cls, value: str) -> str:
        return _validate_token(value)


class VerifyEmailRequest(AuthRequest):
    token: str

    @field_validator("token")
    @classmethod
    def require_token(cls, value: str) -> str:
        return _validate_token(value)


class UpdateProfileRequest(AuthRequest):
    email: str
    first_name: str
    last_name: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _validate_email(value)

    @field_validator("first_name")
    @classmethod
    def require_first_name(cls, value: str) -> str:
        return _validate_name(value, field_name="firstName")

    @field_validator("last_name")
    @classmethod
    def require_last_name(cls, value: str) -> str:
        return _validate_name(value, field_name="lastName")
