from dataclasses import dataclass, field

from src.common.sqlite_model import (
    BlobUuidModel,
    SqliteRowModel,
    id_bytes_to_string,
    new_id_bytes,
)
from src.common.user_agents import device_label_for_user_agent
from src.users.models import UserDisplayProfile

ACCESS_EVENT_LOGIN = "login"
ACCESS_EVENT_LOGOUT = "logout"
ACCESS_EVENT_SESSION_REVOKED = "session_revoked"


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
    user_profile_image_url: str | None = None
    access_log_id: bytes = field(default_factory=new_id_bytes)

    @classmethod
    def uuid_field_name(cls) -> str:
        return "access_log_id"

    @property
    def user_profile(self) -> UserDisplayProfile:
        return UserDisplayProfile(
            email=self.user_email,
            first_name=self.user_first_name,
            last_name=self.user_last_name,
            profile_image_url=self.user_profile_image_url,
        )

    def to_dict(self) -> dict[str, object]:
        return {
            "deviceLabel": device_label_for_user_agent(self.user_agent),
            "eventType": self.event_type,
            "id": self.id,
            "ipAddress": self.ip_address,
            "occurredAt": self.occurred_at,
            "sessionId": id_bytes_to_string(self.session_id),
            "userAgent": self.user_agent,
            "userId": id_bytes_to_string(self.user_id),
            **self.user_profile.to_prefixed_dict("user"),
        }
