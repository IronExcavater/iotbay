from dataclasses import dataclass
from http import HTTPStatus
from typing import TypeVar

from flask import Flask, request
from flask.typing import ResponseReturnValue
from pydantic import BaseModel
from pydantic import ValidationError as PydanticValidationError


class ApiError(Exception):
    def __init__(
        self,
        message: str,
        status_code: int = HTTPStatus.BAD_REQUEST,
        *,
        code: str | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code

    def to_response(self, *, code: str | None = None) -> ResponseReturnValue:
        payload = {"error": self.message}
        resolved_code = self.code if code is None else code
        if resolved_code is not None:
            payload["code"] = resolved_code
        return payload, self.status_code


class ValidationError(ApiError):
    pass


TRequestModel = TypeVar("TRequestModel", bound=BaseModel)


def register_errors(app: Flask) -> None:
    @app.errorhandler(ApiError)
    def handle_api_error(error: ApiError) -> ResponseReturnValue:
        return error.to_response()


def parse_request(model: type[TRequestModel]) -> TRequestModel:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValidationError("request body must be a JSON object")

    try:
        return model.model_validate(data)
    except PydanticValidationError as error:
        raise ValidationError(_request_validation_message(error)) from error


@dataclass(slots=True, frozen=True)
class RequestData:
    data: dict[str, object]

    @classmethod
    def from_request(cls) -> "RequestData":
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            raise ValidationError("request body must be a JSON object")

        return cls(data)

    def string(self, key: str, *, message: str) -> str:
        value = self.data.get(key)
        if not isinstance(value, str):
            raise ValidationError(message)

        value = value.strip()
        if not value:
            raise ValidationError(message)

        return value

    def email(self, key: str = "email", *, message: str) -> str:
        email = self.string(key, message=message)
        local_part, separator, domain = email.partition("@")

        is_valid = local_part and separator and "." in domain and domain.strip(".")
        if not is_valid:
            raise ValidationError("email must be valid")

        return email

    def integer(self, key: str, *, message: str) -> int:
        value = self.data.get(key)
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValidationError(message)
        return value


def _request_validation_message(error: PydanticValidationError) -> str:
    details = error.errors()
    if not details:
        return "request is invalid"

    message = details[0].get("msg")
    if isinstance(message, str) and message.startswith("Value error, "):
        return message.replace("Value error, ", "", 1)
    if isinstance(message, str):
        return message
    return "request is invalid"
