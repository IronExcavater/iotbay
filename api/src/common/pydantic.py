from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


def camel_case_config(**overrides: Any) -> ConfigDict:
    return ConfigDict(
        alias_generator=to_camel,
        validate_by_name=True,
        validate_by_alias=True,
        **overrides,
    )


class ApiRequestModel(BaseModel):
    model_config = camel_case_config(
        str_strip_whitespace=True,
    )


def optional_uuid_value(field_name: str):
    def validate(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            return None
        try:
            UUID(normalized)
        except ValueError as error:
            raise ValueError(f"{field_name} is invalid") from error
        return normalized

    return validate


def uuid_value(field_name: str):
    def validate(value: str) -> str:
        normalized = value.strip()
        try:
            UUID(normalized)
        except ValueError as error:
            raise ValueError(f"{field_name} is invalid") from error
        return normalized

    return validate
