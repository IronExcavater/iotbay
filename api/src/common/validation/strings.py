import string
from dataclasses import dataclass

from src.common.validation.base import Validator

ADDRESS_MAX_LENGTH = 120
EMAIL_MAX_LENGTH = 320
PASSWORD_MAX_LENGTH = 200
TOKEN_MAX_LENGTH = 512
ASCII_VISIBLE_CHARACTERS = set(string.printable) - set("\t\n\r\x0b\x0c")


@dataclass(slots=True, frozen=True)
class StringValidator(Validator[str]):
    field_name: str
    required: bool = False
    max_length: int | None = None
    ascii_only: bool = False
    printable_ascii_only: bool = False
    lowercase: bool = False
    uppercase: bool = False
    required_code: str | None = None
    too_long_code: str | None = None
    invalid_code: str | None = None

    def sanitize_input(self, value: str) -> str:
        normalized = value
        if self.lowercase:
            normalized = normalized.lower()
        if self.uppercase:
            normalized = normalized.upper()
        return normalized

    def validate(self, value: str, **context: object) -> str:
        normalized = self.sanitize_input(value).strip()
        if not normalized:
            if self.required:
                self._fail(f"{self.field_name} is required", code=self.required_code)
            return ""

        if self.max_length is not None and len(normalized) > self.max_length:
            self._fail(
                f"{self.field_name} must be {self.max_length} characters or fewer",
                code=self.too_long_code,
            )
        if self.ascii_only and not normalized.isascii():
            self._fail(
                f"{self.field_name} must use ASCII characters only",
                code=self.invalid_code,
            )
        if self.printable_ascii_only and any(
            character not in ASCII_VISIBLE_CHARACTERS for character in normalized
        ):
            self._fail(
                f"{self.field_name} contains invalid characters",
                code=self.invalid_code,
            )

        if self.lowercase:
            normalized = normalized.lower()
        if self.uppercase:
            normalized = normalized.upper()
        return self.validate_normalized(normalized, **context)

    def validate_normalized(self, value: str, **context: object) -> str:
        return value
