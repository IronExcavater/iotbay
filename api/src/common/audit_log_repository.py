import sqlite3

from src.common.repository import Repository


class AuditLogRepository(Repository):
    def insert_audit_log(
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

    def update_audit_log(
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

    def delete_audit_log(
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
