import re
from dataclasses import dataclass

from src.common.validation.strings import StringValidator

EMAIL_PATTERN = re.compile(
    r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$"
)
NAME_PATTERN = re.compile(r"^[A-Za-z]+(?:[ '-][A-Za-z]+)*$")


@dataclass(slots=True, frozen=True)
class EmailValidator(StringValidator):
    def validate_normalized(self, value: str, **context: object) -> str:
        if not EMAIL_PATTERN.fullmatch(value):
            self._fail(f"{self.field_name} must be valid")
        return value


@dataclass(slots=True, frozen=True)
class ChoiceValidator(StringValidator):
    choices: tuple[str, ...] = ()

    def validate_normalized(self, value: str, **context: object) -> str:
        if value not in self.choices:
            self._fail(f"{self.field_name} is invalid")
        return value


@dataclass(slots=True, frozen=True)
class NameValidator(StringValidator):
    pattern: re.Pattern[str] = NAME_PATTERN

    def validate_normalized(self, value: str, **context: object) -> str:
        if not self.pattern.fullmatch(value):
            self._fail(
                f"{self.field_name} must use letters, spaces, apostrophes or hyphens"
            )
        return value


@dataclass(slots=True, frozen=True)
class AddressValidator(StringValidator):
    pass


@dataclass(slots=True, frozen=True)
class TokenValidator(StringValidator):
    def validate_normalized(self, value: str, **context: object) -> str:
        if " " in value:
            self._fail(f"{self.field_name} is invalid")
        return value
