from dataclasses import dataclass, field

from src.common.sqlite_model import BlobUuidModel, SqliteRowModel, new_id_bytes

USER_TYPE_CUSTOMER = "customer"
USER_TYPE_STAFF = "staff"

USER_STATUS_UNVERIFIED = "unverified"
USER_STATUS_ACTIVE = "active"
USER_STATUS_DISABLED = "disabled"


@dataclass(slots=True, frozen=True)
class Address(SqliteRowModel, BlobUuidModel):
    address_line_one: str
    address_line_two: str
    suburb: str
    state: str
    postcode: str
    country: str
    address_id: bytes = field(default_factory=new_id_bytes)


@dataclass(slots=True, frozen=True)
class User(SqliteRowModel, BlobUuidModel):
    email: str
    password_hash: str
    first_name: str
    last_name: str
    user_type: str
    status: str
    created_at: str
    updated_at: str
    address_id: bytes | None = None
    user_id: bytes = field(default_factory=new_id_bytes)
