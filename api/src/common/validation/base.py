from dataclasses import dataclass
from http import HTTPStatus

from src.common.web import ValidationError


@dataclass(slots=True, frozen=True)
class ValidationIssue:
    message: str
    code: str | None = None


class ValidationFailure(Exception):
    def __init__(self, issue: ValidationIssue) -> None:
        super().__init__(issue.message)
        self.issue = issue


class Validator[T]:
    def validate(self, value: T, **context: object) -> T:
        raise NotImplementedError

    def validate_request(self, value: T, **context: object) -> T:
        try:
            return self.validate(value, **context)
        except ValidationFailure as error:
            raise ValueError(error.issue.message) from error

    def validate_domain(self, value: T, **context: object) -> T:
        try:
            return self.validate(value, **context)
        except ValidationFailure as error:
            raise ValidationError(
                error.issue.message,
                code=error.issue.code,
                status_code=HTTPStatus.BAD_REQUEST,
            ) from error

    def _fail(self, message: str, *, code: str | None = None) -> None:
        raise ValidationFailure(ValidationIssue(message=message, code=code))
