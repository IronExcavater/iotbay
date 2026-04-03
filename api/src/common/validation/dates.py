from dataclasses import dataclass
from datetime import date, datetime

from src.common.validation.strings import StringValidator


@dataclass(slots=True, frozen=True)
class DateValidator(StringValidator):
    def validate_normalized(self, value: str, **context: object) -> str:
        try:
            date.fromisoformat(value)
        except ValueError as error:
            self._fail(f"{self.field_name} must be a valid date")
            raise AssertionError from error
        return value


@dataclass(slots=True, frozen=True)
class DateTimeValidator(StringValidator):
    def validate_normalized(self, value: str, **context: object) -> str:
        try:
            datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as error:
            self._fail(f"{self.field_name} must be a valid datetime")
            raise AssertionError from error
        return value
