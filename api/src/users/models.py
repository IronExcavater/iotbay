from dataclasses import dataclass, field

from src.common.sqlite_model import (
    ApiModel,
    BlobUuidModel,
    SqliteRowModel,
    new_id_bytes,
)

USER_TYPE_CUSTOMER = "customer"
USER_TYPE_STAFF = "staff"

USER_STATUS_UNVERIFIED = "unverified"
USER_STATUS_ACTIVE = "active"
USER_STATUS_DISABLED = "disabled"

USER_TOKEN_PURPOSE_EMAIL_VERIFICATION = "email_verification"
USER_TOKEN_PURPOSE_PASSWORD_RESET = "password_reset"


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
class User(SqliteRowModel, BlobUuidModel, ApiModel):
    public_fields = (
        "id",
        "email",
        "first_name",
        "last_name",
        "user_type",
        "status",
    )

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

    @property
    def is_active(self) -> bool:
        return self.status == USER_STATUS_ACTIVE

    @property
    def needs_email_verification(self) -> bool:
        return self.status == USER_STATUS_UNVERIFIED


@dataclass(slots=True, frozen=True)
class UserSession(SqliteRowModel, BlobUuidModel):
    user_id: bytes
    session_token_hash: str
    created_at: str
    expires_at: str
    session_id: bytes = field(default_factory=new_id_bytes)


@dataclass(slots=True, frozen=True)
class UserToken(SqliteRowModel, BlobUuidModel):
    user_id: bytes
    purpose: str
    token_hash: str
    created_at: str
    expires_at: str
    user_token_id: bytes = field(default_factory=new_id_bytes)
