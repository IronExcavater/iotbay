from dataclasses import dataclass, field

from src.common.sqlite_model import BlobUuidModel, SqliteRowModel, new_id_bytes


@dataclass(slots=True, frozen=True)
class Product(SqliteRowModel, BlobUuidModel):
    name: str
    code: str
    price_cents: int
    created_at: str
    product_id: bytes = field(default_factory=new_id_bytes)

    def to_dict(self) -> dict[str, str | int]:
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "priceCents": self.price_cents,
            "createdAt": self.created_at,
        }
