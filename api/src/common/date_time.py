from datetime import UTC, datetime
from typing import Literal

from babel import dates

DateDisplay = Literal["short", "long", "relative"]
DEFAULT_LOCALE = "en_AU"


def parse_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def format_datetime(
    value: str,
    *,
    display: DateDisplay = "short",
    locale: str = DEFAULT_LOCALE,
    now: datetime | None = None,
) -> str:
    parsed = parse_datetime(value)
    resolved_locale = locale.replace("-", "_") if locale else DEFAULT_LOCALE

    if display == "relative":
        reference = now or datetime.now(tz=UTC)
        if reference.tzinfo is None:
            reference = reference.replace(tzinfo=UTC)
        else:
            reference = reference.astimezone(UTC)
        return dates.format_timedelta(
            parsed - reference,
            add_direction=True,
            locale=resolved_locale,
        )

    return dates.format_datetime(
        parsed,
        format="medium" if display == "short" else "long",
        locale=resolved_locale,
        tzinfo=UTC,
    )
