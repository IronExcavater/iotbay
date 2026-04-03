from dataclasses import dataclass

from src.common.validation.strings import StringValidator

PASSWORD_MIN_LENGTH = 8
PERSONAL_INFO_MIN_LENGTH = 3
REPEAT_LENGTH = 3
SEQUENCE_LENGTH = 4
KEYBOARD_ROWS = (
    "abcdefghijklmnopqrstuvwxyz",
    "qwertyuiop[]\\",
    "QWERTYUIOP{}|",
    "asdfghjkl;'",
    "ASDFGHJKL:",
    "zxcvbnm,./",
    "ZXCVBNM<>?",
    "`1234567890-=",
    "~!@#$%^&*()_+",
)


@dataclass(slots=True, frozen=True)
class PasswordValidator(StringValidator):
    def validate(self, value: str, **context: object) -> str:
        normalized = super().validate(value, **context)
        if len(normalized) < PASSWORD_MIN_LENGTH:
            self._fail(
                "password must be at least 8 characters",
                code="PASSWORD_TOO_SHORT",
            )
        if not _has_number_or_symbol(normalized):
            self._fail(
                "password must include a number or symbol",
                code="PASSWORD_NEEDS_NUMBER_OR_SYMBOL",
            )
        if _contains_personal_info(
            normalized,
            email=str(context.get("email") or ""),
            first_name=str(context.get("first_name") or context.get("firstName") or ""),
            last_name=str(context.get("last_name") or context.get("lastName") or ""),
        ):
            self._fail(
                "password must not contain personal information",
                code="PASSWORD_HAS_PERSONAL_INFO",
            )
        if _has_common_pattern(normalized):
            self._fail(
                "password contains a common pattern",
                code="PASSWORD_HAS_COMMON_PATTERN",
            )
        return normalized


def _contains_personal_info(
    password: str,
    *,
    email: str,
    first_name: str,
    last_name: str,
) -> bool:
    canonical_password = _canonicalise_for_personal_info(password)
    if not canonical_password:
        return False

    return any(
        canonical_password.find(term) >= 0
        for term in _personal_terms(
            email=email,
            first_name=first_name,
            last_name=last_name,
        )
    )


def _personal_terms(
    *,
    email: str,
    first_name: str,
    last_name: str,
) -> set[str]:
    terms: set[str] = set()
    email_local_part = email.split("@")[0] if "@" in email else email

    for raw_value in (email_local_part, first_name, last_name):
        terms.update(_split_terms(raw_value))

    first_name_parts = _split_terms(first_name)
    last_name_parts = _split_terms(last_name)
    if first_name_parts and last_name_parts:
        terms.add("".join((*first_name_parts, *last_name_parts)))
        terms.add("".join((*last_name_parts, *first_name_parts)))

    return terms


def _split_terms(value: str) -> list[str]:
    normalized_value = (
        value.replace("@", " ").replace(".", " ").replace("_", " ").replace("-", " ")
    )
    return [
        canonical_term
        for raw_term in normalized_value.split()
        if (canonical_term := _canonicalise_for_personal_info(raw_term))
        and len(canonical_term) >= PERSONAL_INFO_MIN_LENGTH
    ]


def _canonicalise_for_personal_info(value: str) -> str:
    substitutions = {
        "0": "o",
        "1": "i",
        "3": "e",
        "4": "a",
        "5": "s",
        "7": "t",
        "@": "a",
        "$": "s",
        "!": "i",
        "+": "t",
    }

    return "".join(
        substitutions.get(character, character)
        for character in value.lower()
        if character.isalnum() or character in substitutions
    )


def _has_number_or_symbol(password: str) -> bool:
    return any(character.isdigit() or not character.isalnum() for character in password)


def _has_common_pattern(password: str) -> bool:
    canonical_password = _canonicalise_for_pattern_match(password)
    return (
        _has_repeated_characters(canonical_password)
        or _has_repeated_chunks(canonical_password)
        or _has_ordered_sequence(canonical_password)
        or _has_keyboard_sequence(canonical_password)
    )


def _canonicalise_for_pattern_match(value: str) -> str:
    return "".join(character for character in value.lower() if character.isalnum())


def _has_repeated_characters(value: str) -> bool:
    repeats = 1

    for index in range(1, len(value)):
        repeats = repeats + 1 if value[index] == value[index - 1] else 1
        if repeats >= REPEAT_LENGTH:
            return True

    return False


def _has_repeated_chunks(value: str) -> bool:
    for size in range(1, len(value) // 2 + 1):
        if len(value) % size != 0:
            continue

        chunk = value[:size]
        if chunk * (len(value) // size) == value:
            return True

    return False


def _has_ordered_sequence(value: str) -> bool:
    for start in range(0, len(value) - SEQUENCE_LENGTH + 1):
        window = value[start : start + SEQUENCE_LENGTH]
        if _is_step_sequence(window, 1) or _is_step_sequence(window, -1):
            return True
    return False


def _is_step_sequence(value: str, step: int) -> bool:
    return all(
        ord(value[index + 1]) - ord(value[index]) == step
        for index in range(len(value) - 1)
    )


def _has_keyboard_sequence(value: str) -> bool:
    return any(
        _contains_sequence(row, value) or _contains_sequence(row[::-1], value)
        for row in KEYBOARD_ROWS
    )


def _contains_sequence(source: str, value: str) -> bool:
    return any(
        source.find(value[start : start + SEQUENCE_LENGTH]) >= 0
        for start in range(0, len(value) - SEQUENCE_LENGTH + 1)
    )
