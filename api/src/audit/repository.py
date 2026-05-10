import sqlite3

from src.audit.models import AuditEvent
from src.common.repository import Repository


class AuditRepository(Repository):
    def insert_entity(
        self,
        connection: sqlite3.Connection,
        *,
        entity_type: str,
        entity_id: bytes,
        created_at: str,
        updated_at: str,
        created_by_user_id: bytes | None = None,
        updated_by_user_id: bytes | None = None,
    ) -> None:
        self.insert_into(
            connection,
            "entity_audit_log",
            {
                "entity_type": entity_type,
                "entity_id": entity_id,
                "created_at": created_at,
                "created_by_user_id": created_by_user_id,
                "updated_at": updated_at,
                "updated_by_user_id": updated_by_user_id,
            },
        )

    def update_entity(
        self,
        connection: sqlite3.Connection,
        *,
        entity_type: str,
        entity_id: bytes,
        updated_at: str,
        updated_by_user_id: bytes | None = None,
    ) -> None:
        self.update_where(
            connection,
            "entity_audit_log",
            {
                "updated_at": updated_at,
                "updated_by_user_id": updated_by_user_id,
            },
            where="entity_type = ? AND entity_id = ?",
            where_parameters=(entity_type, entity_id),
        )

    def delete_entity(
        self,
        connection: sqlite3.Connection,
        *,
        entity_type: str,
        entity_id: bytes,
    ) -> None:
        self.delete_from(
            connection,
            "entity_audit_log",
            where="entity_type = ? AND entity_id = ?",
            where_parameters=(entity_type, entity_id),
        )

    def insert_event(
        self,
        connection: sqlite3.Connection,
        *,
        action: str,
        entity_type: str,
        entity_id: bytes,
        occurred_at: str,
        actor_user_id: bytes | None = None,
        before_json: str | None = None,
        after_json: str | None = None,
        diff_json: str | None = None,
        origin: str = "direct",
        source_audit_event_id: bytes | None = None,
    ) -> AuditEvent:
        event = AuditEvent(
            action=action,
            actor_user_id=actor_user_id,
            after_json=after_json,
            before_json=before_json,
            diff_json=diff_json,
            entity_id=entity_id,
            entity_type=entity_type,
            origin=origin,
            occurred_at=occurred_at,
            source_audit_event_id=source_audit_event_id,
        )
        self.insert_into(
            connection,
            "audit_events",
            {
                "audit_event_id": event.audit_event_id,
                "entity_type": event.entity_type,
                "entity_id": event.entity_id,
                "action": event.action,
                "actor_user_id": event.actor_user_id,
                "occurred_at": event.occurred_at,
                "before_json": event.before_json,
                "after_json": event.after_json,
                "diff_json": event.diff_json,
                "origin": event.origin,
                "source_audit_event_id": event.source_audit_event_id,
            },
        )
        return event

    def get_event(self, *, audit_event_id: bytes) -> AuditEvent | None:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT
                    audit_events.*,
                    actors.email AS actor_email,
                    actors.first_name AS actor_first_name,
                    actors.last_name AS actor_last_name
                FROM audit_events
                LEFT JOIN users AS actors
                    ON actors.user_id = audit_events.actor_user_id
                WHERE audit_events.audit_event_id = ?
                """,
                (audit_event_id,),
            ).fetchone()
        return AuditEvent.from_row(row) if row is not None else None

    def list_events(
        self,
        *,
        action: str | None = None,
        entity_type: str | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
        limit: int = 250,
    ) -> list[AuditEvent]:
        conditions: list[str] = []
        parameters: list[object] = []

        if entity_type:
            conditions.append("audit_events.entity_type = ?")
            parameters.append(entity_type)
        if action:
            conditions.append("audit_events.action = ?")
            parameters.append(action)
        if from_date:
            conditions.append("substr(audit_events.occurred_at, 1, 10) >= ?")
            parameters.append(from_date)
        if to_date:
            conditions.append("substr(audit_events.occurred_at, 1, 10) <= ?")
            parameters.append(to_date)

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        with self.connect() as connection:
            rows = connection.execute(
                f"""
                SELECT
                    audit_events.*,
                    actors.email AS actor_email,
                    actors.first_name AS actor_first_name,
                    actors.last_name AS actor_last_name
                FROM audit_events
                LEFT JOIN users AS actors
                    ON actors.user_id = audit_events.actor_user_id
                {where}
                ORDER BY audit_events.occurred_at DESC, audit_events.audit_event_id DESC
                LIMIT ?
                """,
                (*parameters, limit),
            ).fetchall()
        return [AuditEvent.from_row(row) for row in rows]

    def list_entity_events(
        self,
        *,
        entity_type: str,
        entity_id: bytes,
        limit: int = 50,
    ) -> list[AuditEvent]:
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT
                    audit_events.*,
                    actors.email AS actor_email,
                    actors.first_name AS actor_first_name,
                    actors.last_name AS actor_last_name
                FROM audit_events
                LEFT JOIN users AS actors
                    ON actors.user_id = audit_events.actor_user_id
                WHERE audit_events.entity_type = ?
                  AND audit_events.entity_id = ?
                ORDER BY audit_events.occurred_at DESC, audit_events.audit_event_id DESC
                LIMIT ?
                """,
                (entity_type, entity_id, limit),
            ).fetchall()
        return [AuditEvent.from_row(row) for row in rows]
