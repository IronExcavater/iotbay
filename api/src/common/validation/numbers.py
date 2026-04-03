from dataclasses import dataclass

from src.common.validation.base import Validator


@dataclass(slots=True, frozen=True)
class NumberValidator(Validator[int]):
    field_name: str
    min_value: int | None = None
    max_value: int | None = None

    def validate(self, value: int, **context: object) -> int:
        if isinstance(value, bool) or not isinstance(value, int):
            self._fail(
                self._invalid_type_message(),
                code=self._invalid_type_code(),
            )
        if self.min_value is not None and value < self.min_value:
            self._fail(
                self._too_small_message(),
                code=self._too_small_code(),
            )
        if self.max_value is not None and value > self.max_value:
            self._fail(
                self._too_large_message(),
                code=self._too_large_code(),
            )
        return value

    def _invalid_type_message(self) -> str:
        return f"{self.field_name} must be an integer"

    def _invalid_type_code(self) -> str | None:
        return None

    def _too_small_message(self) -> str:
        return f"{self.field_name} must be at least {self.min_value}"

    def _too_small_code(self) -> str | None:
        return None

    def _too_large_message(self) -> str:
        return f"{self.field_name} must be {self.max_value} or fewer"

    def _too_large_code(self) -> str | None:
        return None


@dataclass(slots=True, frozen=True)
class MoneyValidator(NumberValidator):
    too_small_code: str | None = None
    too_large_code: str | None = None

    def _too_small_message(self) -> str:
        return f"{self.field_name} must be zero or greater"

    def _too_small_code(self) -> str | None:
        return self.too_small_code

    def _too_large_message(self) -> str:
        return f"{self.field_name} is too large"

    def _too_large_code(self) -> str | None:
        return self.too_large_code
