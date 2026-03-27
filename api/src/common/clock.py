from dataclasses import dataclass
from datetime import UTC, datetime, timedelta


@dataclass(slots=True, frozen=True)
class UtcTime:
    value: datetime

    def __post_init__(self) -> None:
        # Keep timestamps in the standard "+00:00" ISO form
        object.__setattr__(self, "value", self.value.astimezone(UTC))

    @classmethod
    def now(cls) -> "UtcTime":
        return cls(datetime.now(tz=UTC))

    @classmethod
    def parse(cls, value: str) -> "UtcTime":
        return cls(datetime.fromisoformat(value.replace("Z", "+00:00")))

    @property
    def iso(self) -> str:
        return self.value.isoformat(timespec="microseconds")

    def add(
        self,
        *,
        weeks: int = 0,
        days: int = 0,
        hours: int = 0,
        minutes: int = 0,
        seconds: int = 0,
        milliseconds: int = 0,
        microseconds: int = 0,
    ) -> "UtcTime":
        return UtcTime(
            self.value
            + timedelta(
                weeks=weeks,
                days=days,
                hours=hours,
                minutes=minutes,
                seconds=seconds,
                milliseconds=milliseconds,
                microseconds=microseconds,
            )
        )

    def is_before(self, *, other: "UtcTime | None" = None) -> bool:
        return self.value <= (other or UtcTime.now()).value
