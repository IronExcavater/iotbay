from dataclasses import dataclass, field

from src.common.sqlite_model import (
    ApiModel,
    BlobUuidModel,
    SqliteRowModel,
    new_id_bytes,
)


@dataclass(slots=True, frozen=True)
class Product(SqliteRowModel, BlobUuidModel, ApiModel):
    public_fields = ("id", "name", "code", "price_cents", "created_at")

    name: str
    code: str
    price_cents: int
    created_at: str
    product_id: bytes = field(default_factory=new_id_bytes)
