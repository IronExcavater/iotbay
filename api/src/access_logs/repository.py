import sqlite3

from src.access_logs.models import AccessLogEntry
from src.common.repository import Repository


class AccessLogRepository(Repository):
    def insert_access_log(
        self,
        connection: sqlite3.Connection,
        *,
        user_id: bytes,
        session_id: bytes,
        event_type: str,
        occurred_at: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AccessLogEntry:
        entry = AccessLogEntry(
            event_type=event_type,
            ip_address=ip_address,
            occurred_at=occurred_at,
            session_id=session_id,
            user_agent=user_agent,
            user_id=user_id,
        )
        self.insert_into(
            connection,
            "access_logs",
            {
                "access_log_id": entry.access_log_id,
                "user_id": entry.user_id,
                "session_id": entry.session_id,
                "event_type": entry.event_type,
                "occurred_at": entry.occurred_at,
                "ip_address": entry.ip_address,
                "user_agent": entry.user_agent,
            },
        )
        return entry

    def list_user_access_logs(
        self,
        *,
        user_id: bytes,
        event_type: str | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
        limit: int = 250,
    ) -> list[AccessLogEntry]:
        return self._list_access_logs(
            event_type=event_type,
            from_date=from_date,
            limit=limit,
            to_date=to_date,
            user_id=user_id,
        )

    def list_admin_access_logs(
        self,
        *,
        event_type: str | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
        limit: int = 250,
    ) -> list[AccessLogEntry]:
        return self._list_access_logs(
            event_type=event_type,
            from_date=from_date,
            limit=limit,
            to_date=to_date,
            user_id=None,
        )

    def _list_access_logs(
        self,
        *,
        event_type: str | None,
        from_date: str | None,
        limit: int,
        to_date: str | None,
        user_id: bytes | None,
    ) -> list[AccessLogEntry]:
        conditions: list[str] = []
        parameters: list[object] = []

        if user_id is not None:
            conditions.append("access_logs.user_id = ?")
            parameters.append(user_id)
        if event_type:
            conditions.append("access_logs.event_type = ?")
            parameters.append(event_type)
        if from_date:
            conditions.append("substr(access_logs.occurred_at, 1, 10) >= ?")
            parameters.append(from_date)
        if to_date:
            conditions.append("substr(access_logs.occurred_at, 1, 10) <= ?")
            parameters.append(to_date)

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        with self.connect() as connection:
            rows = connection.execute(
                f"""
                SELECT
                    access_logs.*,
                    users.email AS user_email,
                    users.first_name AS user_first_name,
                    users.last_name AS user_last_name
                FROM access_logs
                JOIN users ON users.user_id = access_logs.user_id
                {where}
                ORDER BY access_logs.occurred_at DESC, access_logs.access_log_id DESC
                LIMIT ?
                """,
                (*parameters, limit),
            ).fetchall()

        return [AccessLogEntry.from_row(row) for row in rows]
