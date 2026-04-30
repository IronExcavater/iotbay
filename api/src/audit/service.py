import json
import sqlite3
from dataclasses import dataclass

from src.audit.models import AuditEvent
from src.audit.repository import AuditRepository


def _serialize(value: object | None) -> str | None:
    if value is None:
        return None
    return json.dumps(value, default=str, separators=(",", ":"), sort_keys=True)


def _diff(
    before: dict[str, object] | None,
    after: dict[str, object] | None,
) -> object | None:
    left = before or {}
    right = after or {}
    changes = {
        key: {"before": left.get(key), "after": right.get(key)}
        for key in sorted(set(left) | set(right))
        if left.get(key) != right.get(key)
    }
    return changes or None


@dataclass(slots=True, frozen=True)
class AuditService:
    repository: AuditRepository

    def record_event(
        self,
        connection: sqlite3.Connection,
        *,
        action: str,
        entity_type: str,
        entity_id: bytes,
        occurred_at: str,
        actor_user_id: bytes | None = None,
        before: dict[str, object] | None = None,
        after: dict[str, object] | None = None,
        origin: str = "direct",
        source_audit_event_id: bytes | None = None,
    ) -> AuditEvent:
        return self.repository.insert_event(
            connection,
            action=action,
            actor_user_id=actor_user_id,
            after_json=_serialize(after),
            before_json=_serialize(before),
            diff_json=_serialize(_diff(before, after)),
            entity_id=entity_id,
            entity_type=entity_type,
            origin=origin,
            occurred_at=occurred_at,
            source_audit_event_id=source_audit_event_id,
        )

    def list_events(
        self,
        *,
        action: str | None = None,
        entity_type: str | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> list[AuditEvent]:
        return self.repository.list_events(
            action=action,
            entity_type=entity_type,
            from_date=from_date,
            to_date=to_date,
        )

    def get_event(self, *, audit_event_id: bytes) -> AuditEvent | None:
        return self.repository.get_event(audit_event_id=audit_event_id)

    def list_entity_events(
        self,
        *,
        entity_type: str,
        entity_id: bytes,
    ) -> list[AuditEvent]:
        return self.repository.list_entity_events(
            entity_id=entity_id,
            entity_type=entity_type,
        )
