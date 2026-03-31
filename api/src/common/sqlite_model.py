import sqlite3
import uuid
from dataclasses import fields, is_dataclass
from typing import Any, Self, cast


def new_id_bytes() -> bytes:
    return uuid.uuid4().bytes


def id_bytes_to_string(value: bytes) -> str:
    return str(uuid.UUID(bytes=value))


class SqliteRowModel:
    @classmethod
    def from_row(cls, row: sqlite3.Row) -> Self:
        if not is_dataclass(cls):
            raise TypeError(f"{cls.__name__} must be a dataclass")

        instance = object.__new__(cls)
        row_keys = set(row.keys())
        dataclass_type = cast(Any, cls)

        for model_field in fields(dataclass_type):
            if model_field.name in row_keys:
                object.__setattr__(instance, model_field.name, row[model_field.name])

        return instance


class BlobUuidModel:
    @classmethod
    def uuid_field_name(cls) -> str:
        return f"{cls.__name__.lower()}_id"

    @property
    def id(self) -> str:
        field_name = type(self).uuid_field_name()
        value = getattr(self, field_name, None)
        if not isinstance(value, bytes):
            raise TypeError(f"{field_name} must be bytes")
        return id_bytes_to_string(value)
