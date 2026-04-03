import sqlite3
from collections.abc import Sequence
from contextlib import AbstractContextManager

from src.db import connect


class Repository:
    def __init__(self, database_path: str) -> None:
        self._database_path = database_path

    def connect(self) -> AbstractContextManager[sqlite3.Connection]:
        return connect(self._database_path)

    def insert_into(
        self,
        connection: sqlite3.Connection,
        table_name: str,
        values: dict[str, object],
    ) -> None:
        column_names = tuple(values)
        parameters = tuple(values[column_name] for column_name in column_names)
        placeholders = ", ".join("?" for _ in column_names)
        connection.execute(
            (
                f"INSERT INTO {table_name} "
                f"({', '.join(column_names)}) "
                f"VALUES ({placeholders})"
            ),
            parameters,
        )

    def upsert_into(
        self,
        connection: sqlite3.Connection,
        table_name: str,
        insert_values: dict[str, object],
        *,
        where: str,
        where_parameters: Sequence[object] = (),
        update_values: dict[str, object] | None = None,
    ) -> int:
        resolved_update_values = (
            insert_values if update_values is None else update_values
        )
        updated_count = self.update_where(
            connection,
            table_name,
            resolved_update_values,
            where=where,
            where_parameters=where_parameters,
        )
        if updated_count > 0:
            return updated_count

        self.insert_into(connection, table_name, insert_values)
        return 1

    def upsert_on_conflict(
        self,
        connection: sqlite3.Connection,
        table_name: str,
        values: dict[str, object],
        *,
        conflict_columns: tuple[str, ...],
        update_columns: tuple[str, ...] | None = None,
    ) -> None:
        column_names = tuple(values)
        parameters = tuple(values[column_name] for column_name in column_names)
        resolved_update_columns = (
            update_columns
            if update_columns is not None
            else tuple(
                column_name
                for column_name in column_names
                if column_name not in conflict_columns
            )
        )
        # Keep callers explicit about what they write while avoiding repeated
        # ON CONFLICT boilerplate throughout the repositories.
        updates = ", ".join(
            f"{column_name} = excluded.{column_name}"
            for column_name in resolved_update_columns
        )
        conflict_target = ", ".join(conflict_columns)
        placeholders = ", ".join("?" for _ in column_names)

        connection.execute(
            (
                f"INSERT INTO {table_name} ({', '.join(column_names)}) "
                f"VALUES ({placeholders}) "
                f"ON CONFLICT({conflict_target}) DO UPDATE SET {updates}"
            ),
            parameters,
        )

    def update_where(
        self,
        connection: sqlite3.Connection,
        table_name: str,
        values: dict[str, object],
        *,
        where: str,
        where_parameters: Sequence[object] = (),
    ) -> int:
        column_names = tuple(values)
        if not column_names:
            return 0

        parameters = tuple(values[column_name] for column_name in column_names)
        assignments = ", ".join(f"{column_name} = ?" for column_name in column_names)
        cursor = connection.execute(
            f"UPDATE {table_name} SET {assignments} WHERE {where}",
            (*parameters, *where_parameters),
        )
        return int(cursor.rowcount)

    def delete_from(
        self,
        connection: sqlite3.Connection,
        table_name: str,
        *,
        where: str,
        where_parameters: Sequence[object] = (),
    ) -> int:
        cursor = connection.execute(
            f"DELETE FROM {table_name} WHERE {where}",
            tuple(where_parameters),
        )
        return int(cursor.rowcount)
