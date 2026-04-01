import re

from src.common.web import ValidationError

PASSWORD_MIN_LENGTH = 8
PERSONAL_INFO_MIN_LENGTH = 3
REPEAT_LENGTH = 3
SEQUENCE_LENGTH = 4
KEYBOARD_ROWS = (
    "abcdefghijklmnopqrstuvwxyz",
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm",
    "1234567890",
)


def validate_password(
    password: str,
    *,
    email: str = "",
    first_name: str = "",
    last_name: str = "",
) -> str:
    value = password.strip()

    if len(value) < PASSWORD_MIN_LENGTH:
        raise ValidationError(
            "password must be at least 8 characters",
            code="PASSWORD_TOO_SHORT",
        )
    if not _has_number_or_symbol(value):
        raise ValidationError(
            "password must include a number or symbol",
            code="PASSWORD_NEEDS_NUMBER_OR_SYMBOL",
        )
    if _contains_personal_info(value, _personal_terms(email, first_name, last_name)):
        raise ValidationError(
            "password must not contain personal information",
            code="PASSWORD_HAS_PERSONAL_INFO",
        )
    if _has_common_pattern(value):
        raise ValidationError(
            "password contains a common pattern",
            code="PASSWORD_HAS_COMMON_PATTERN",
        )

    return value


def _personal_terms(email: str, first_name: str, last_name: str) -> tuple[str, ...]:
    terms: set[str] = set()
    for raw_value in (email, first_name, last_name):
        terms.update(_split_terms(raw_value))

    name_parts = [part for part in _split_terms(first_name) if part]
    surname_parts = [part for part in _split_terms(last_name) if part]
    if name_parts and surname_parts:
        terms.add("".join(name_parts + surname_parts))
        terms.add("".join(surname_parts + name_parts))

    return tuple(terms)


def _has_number_or_symbol(password: str) -> bool:
    return any(character.isdigit() or not character.isalnum() for character in password)


def _contains_personal_info(password: str, personal_terms: tuple[str, ...]) -> bool:
    normalized_password = _normalize(password)
    return any(
        term in normalized_password
        for term in {
            _normalize(raw_term)
            for raw_term in personal_terms
            if len(_normalize(raw_term)) >= PERSONAL_INFO_MIN_LENGTH
        }
    )


def _split_terms(value: str) -> tuple[str, ...]:
    # Split on common separators first, then normalize each fragment so
    # personal-info matching works for dotted emails and hyphenated names.
    parts = (_normalize(part) for part in re.split(r"[\s@._-]+", value))
    return tuple(part for part in parts if len(part) >= PERSONAL_INFO_MIN_LENGTH)


def _has_common_pattern(password: str) -> bool:
    normalized_password = _normalize(password)
    return any(
        check(normalized_password)
        for check in (
            _has_repeated_characters,
            _has_repeated_chunks,
            _has_ordered_sequence,
            _has_keyboard_sequence,
        )
    )


def _normalize(value: str) -> str:
    substitutions = str.maketrans(
        {
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
    )
    return "".join(
        character
        for character in value.lower().translate(substitutions)
        if character.isalnum()
    )


def _has_repeated_characters(value: str) -> bool:
    repeats = 1
    for index in range(1, len(value)):
        repeats = repeats + 1 if value[index] == value[index - 1] else 1
        if repeats >= REPEAT_LENGTH:
            return True
    return False


def _has_repeated_chunks(value: str) -> bool:
    for size in range(1, max(2, len(value) // 2 + 1)):
        if len(value) < size * 2:
            break

        chunk = value[:size]
        repeats = len(value) // size
        if chunk * repeats == value[: len(chunk) * repeats] and len(value) % size == 0:
            return True
    return False


def _has_ordered_sequence(value: str) -> bool:
    if len(value) < SEQUENCE_LENGTH:
        return False

    for start in range(len(value) - SEQUENCE_LENGTH + 1):
        window = value[start : start + SEQUENCE_LENGTH]
        if _is_step_sequence(window, 1) or _is_step_sequence(window, -1):
            return True
    return False


def _has_keyboard_sequence(value: str) -> bool:
    return any(
        _contains_sequence(row, value) or _contains_sequence(row[::-1], value)
        for row in KEYBOARD_ROWS
    )


def _contains_sequence(sequence_source: str, value: str) -> bool:
    for start in range(len(value) - SEQUENCE_LENGTH + 1):
        window = value[start : start + SEQUENCE_LENGTH]
        if window in sequence_source:
            return True
    return False


def _is_step_sequence(value: str, step: int) -> bool:
    return all(
        ord(value[index + 1]) - ord(value[index]) == step
        for index in range(len(value) - 1)
    )
