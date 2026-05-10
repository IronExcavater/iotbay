import json
from dataclasses import dataclass, field

from src.common.sqlite_model import (
    BlobUuidModel,
    SqliteRowModel,
    id_bytes_to_string,
    new_id_bytes,
)
from src.users.models import UserDisplayProfile

AUDIT_ACTION_LOGOUT_OTHERS = "logout_others"
AUDIT_ACTION_MANAGED_USER_UPDATED = "managed_user_updated"
AUDIT_ACTION_MFA_SETTINGS_UPDATED = "mfa_settings_updated"
AUDIT_ACTION_PASSWORD_UPDATED = "password_updated"
AUDIT_ACTION_PROFILE_UPDATED = "profile_updated"
AUDIT_ACTION_SESSION_REVOKED = "session_revoked"
AUDIT_ACTION_STAFF_INVITED = "staff_invited"
AUDIT_ACTION_STAFF_REGISTRATION_COMPLETED = "staff_registration_completed"
AUDIT_ACTION_STATUS_CHANGED = "status_changed"
AUDIT_ACTION_CREATED = "created"
AUDIT_ACTION_EMAIL_VERIFIED = "email_verified"
AUDIT_ACTION_UPDATED = "updated"
ENTITY_TYPE_USER = "user"
ENTITY_TYPE_PRODUCT = "product"
ENTITY_TYPE_ORDER = "order"
AUDIT_ORIGIN_DIRECT = "direct"
AUDIT_ORIGIN_REDO = "redo"
AUDIT_ORIGIN_UNDO = "undo"


def _safe_json_loads(value: str | None) -> object | None:
    if not value:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return None


@dataclass(slots=True, frozen=True)
class AuditEvent(SqliteRowModel, BlobUuidModel):
    entity_type: str
    entity_id: bytes
    action: str
    occurred_at: str
    actor_user_id: bytes | None = None
    before_json: str | None = None
    after_json: str | None = None
    diff_json: str | None = None
    origin: str = AUDIT_ORIGIN_DIRECT
    source_audit_event_id: bytes | None = None
    actor_first_name: str | None = None
    actor_last_name: str | None = None
    actor_email: str | None = None
    actor_profile_image_url: str | None = None
    audit_event_id: bytes = field(default_factory=new_id_bytes)

    @classmethod
    def uuid_field_name(cls) -> str:
        return "audit_event_id"

    @property
    def actor_profile(self) -> UserDisplayProfile:
        return UserDisplayProfile(
            email=self.actor_email,
            first_name=self.actor_first_name,
            last_name=self.actor_last_name,
            profile_image_url=self.actor_profile_image_url,
        )

    def to_dict(self) -> dict[str, object]:
        return {
            "action": self.action,
            "actorUserId": (
                id_bytes_to_string(self.actor_user_id)
                if self.actor_user_id is not None
                else None
            ),
            **self.actor_profile.to_prefixed_dict("actor"),
            "after": _safe_json_loads(self.after_json),
            "before": _safe_json_loads(self.before_json),
            "diff": _safe_json_loads(self.diff_json),
            "entityId": id_bytes_to_string(self.entity_id),
            "entityType": self.entity_type,
            "id": self.id,
            "occurredAt": self.occurred_at,
            "origin": self.origin,
            "sourceAuditEventId": (
                id_bytes_to_string(self.source_audit_event_id)
                if self.source_audit_event_id is not None
                else None
            ),
        }
