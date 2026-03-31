import sqlite3
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
        column_names = tuple(values.keys())
        columns = ", ".join(column_names)
        placeholders = ", ".join("?" for _ in column_names)
        connection.execute(
            f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})",
            tuple(values[column_name] for column_name in column_names),
        )
