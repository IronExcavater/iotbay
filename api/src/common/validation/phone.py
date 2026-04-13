import re
from dataclasses import dataclass

import phonenumbers
from src.common.validation.strings import StringValidator

PHONE_COUNTRY_LENGTH = 2
PHONE_NUMBER_MAX_LENGTH = 40
DEFAULT_PHONE_COUNTRY = "AU"


@dataclass(slots=True, frozen=True)
class PhoneCountryValidator(StringValidator):
    def sanitize_input(self, value: str) -> str:
        # slots=True dataclasses can break zero-arg super(), so call the base
        # implementation explicitly.
        return (
            StringValidator.sanitize_input(self, value)
            .replace(" ", "")
            .upper()[:PHONE_COUNTRY_LENGTH]
        )

    def validate(self, value: str, **context: object) -> str:
        normalized = StringValidator.validate(self, value, **context)
        if normalized and not re.fullmatch(r"[A-Z]{2}", normalized):
            self._fail("phoneCountry is invalid", code="PHONE_COUNTRY_INVALID")
        return normalized


@dataclass(slots=True, frozen=True)
class PhoneValidator(StringValidator):
    default_country: str = DEFAULT_PHONE_COUNTRY

    def sanitize_input(self, value: str) -> str:
        normalized = StringValidator.sanitize_input(self, value)
        result = ""

        for character in normalized:
            if character.isdigit():
                result += character
                continue
            if character == "+" and not result:
                result += character

        if self.max_length is not None:
            return result[: self.max_length]
        return result

    def validate(self, value: str, **context: object) -> str:
        normalized = StringValidator.validate(self, value, **context)
        if not normalized:
            return normalized

        phone_country = PhoneCountryValidator(
            field_name="phoneCountry",
            ascii_only=True,
            uppercase=True,
        ).validate(
            str(
                context.get("phone_country")
                or context.get("phoneCountry")
                or self.default_country
            )
        )
        parsed = _parse_phone_number(normalized, phone_country)
        if parsed is None:
            self._fail("phone number is invalid", code="PHONE_NUMBER_INVALID")
            raise AssertionError("unreachable")

        return phonenumbers.format_number(
            parsed,
            phonenumbers.PhoneNumberFormat.E164,
        )


def _parse_phone_number(
    value: str,
    country: str,
) -> phonenumbers.PhoneNumber | None:
    for candidate in _phone_candidates(value):
        try:
            parsed = phonenumbers.parse(
                candidate,
                None if candidate.startswith("+") else country,
            )
        except phonenumbers.NumberParseException:
            continue

        if phonenumbers.is_valid_number(parsed):
            return parsed

    return None


def _phone_candidates(value: str) -> list[str]:
    if value.startswith("+"):
        return [value]

    digits = value.replace(" ", "")
    if not digits:
        return []

    candidates = [digits]
    if not digits.startswith("0"):
        candidates.append(f"0{digits}")
    candidates.append(f"+{digits}")
    return list(dict.fromkeys(candidates))
