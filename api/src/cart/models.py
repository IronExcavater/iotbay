import json
from dataclasses import dataclass, field

from src.common.sqlite_model import (
    ApiModel,
    BlobUuidModel,
    SqliteRowModel,
    id_bytes_to_string,
    new_id_bytes,
)


@dataclass(slots=True, frozen=True)
class CartItem(SqliteRowModel):
    cart_id: bytes
    product_id: bytes
    quantity: int
    name: str
    code: str
    price_cents: int
    media_urls_json: str = "[]"

    @property
    def image_url(self) -> str:
        try:
            media_urls = json.loads(self.media_urls_json or "[]")
        except json.JSONDecodeError:
            return ""
        if (
            isinstance(media_urls, list)
            and len(media_urls) > 0
            and isinstance(media_urls[0], str)
        ):
            return media_urls[0]
        return ""

    def to_dict(self) -> dict[str, object]:
        return {
            "productId": id_bytes_to_string(self.product_id),
            "quantity": self.quantity,
            "name": self.name,
            "code": self.code,
            "priceCents": self.price_cents,
            "imageUrl": self.image_url,
        }


@dataclass(slots=True, frozen=True)
class Cart(SqliteRowModel, BlobUuidModel, ApiModel):
    public_fields = ("id", "items")

    user_id: bytes
    cart_id: bytes = field(default_factory=new_id_bytes)
    items: list[CartItem] = field(default_factory=list)

    def to_dict(self) -> dict[str, object]:
        result = super().to_dict()
        result["items"] = [item.to_dict() for item in self.items]
        return result
