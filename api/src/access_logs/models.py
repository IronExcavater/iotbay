from dataclasses import dataclass, field

from src.common.sqlite_model import (
    BlobUuidModel,
    SqliteRowModel,
    id_bytes_to_string,
    new_id_bytes,
)

ACCESS_EVENT_LOGIN = "login"
ACCESS_EVENT_LOGOUT = "logout"
ACCESS_EVENT_SESSION_REVOKED = "session_revoked"


def device_label_for_user_agent(user_agent: str | None) -> str:
    value = (user_agent or "").lower()
    browser = None
    platform = None

    if "edg/" in value:
        browser = "Edge"
    elif "chrome/" in value:
        browser = "Chrome"
    elif "firefox/" in value:
        browser = "Firefox"
    elif "safari/" in value:
        browser = "Safari"

    if "iphone" in value:
        platform = "iPhone"
    elif "ipad" in value:
        platform = "iPad"
    elif "android" in value:
        platform = "Android"
    elif "windows" in value:
        platform = "Windows"
    elif "macintosh" in value or "mac os x" in value:
        platform = "macOS"
    elif "linux" in value:
        platform = "Linux"

    if browser and platform:
        return f"{browser} on {platform}"
    return browser or platform or "Unknown device"


def _user_name(first_name: str | None, last_name: str | None) -> str | None:
    parts = [part for part in (first_name, last_name) if part]
    return " ".join(parts) if parts else None


@dataclass(slots=True, frozen=True)
class AccessLogEntry(SqliteRowModel, BlobUuidModel):
    user_id: bytes
    session_id: bytes
    event_type: str
    occurred_at: str
    ip_address: str | None = None
    user_agent: str | None = None
    user_email: str | None = None
    user_first_name: str | None = None
    user_last_name: str | None = None
    access_log_id: bytes = field(default_factory=new_id_bytes)

    @classmethod
    def uuid_field_name(cls) -> str:
        return "access_log_id"

    def to_dict(self) -> dict[str, object]:
        return {
            "deviceLabel": device_label_for_user_agent(self.user_agent),
            "eventType": self.event_type,
            "id": self.id,
            "ipAddress": self.ip_address,
            "occurredAt": self.occurred_at,
            "sessionId": id_bytes_to_string(self.session_id),
            "userAgent": self.user_agent,
            "userEmail": self.user_email,
            "userId": id_bytes_to_string(self.user_id),
            "userName": _user_name(self.user_first_name, self.user_last_name),
        }
