from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel


class AuthRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        str_strip_whitespace=True,
    )


class RegisterRequest(AuthRequest):
    email: str
    password: str
    first_name: str
    last_name: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        local_part, separator, domain = value.partition("@")
        is_valid = local_part and separator and "." in domain and domain.strip(".")
        if not is_valid:
            raise ValueError("email must be valid")
        return value

    @field_validator("password")
    @classmethod
    def require_password(cls, value: str) -> str:
        if not value:
            raise ValueError("password is required")
        return value

    @field_validator("first_name")
    @classmethod
    def require_first_name(cls, value: str) -> str:
        if not value:
            raise ValueError("firstName is required")
        return value

    @field_validator("last_name")
    @classmethod
    def require_last_name(cls, value: str) -> str:
        if not value:
            raise ValueError("lastName is required")
        return value


class LoginRequest(AuthRequest):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        local_part, separator, domain = value.partition("@")
        is_valid = local_part and separator and "." in domain and domain.strip(".")
        if not is_valid:
            raise ValueError("email must be valid")
        return value

    @field_validator("password")
    @classmethod
    def require_password(cls, value: str) -> str:
        if not value:
            raise ValueError("password is required")
        return value
