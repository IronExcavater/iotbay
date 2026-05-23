import json
from dataclasses import dataclass, field

from src.common.sqlite_model import (
    ApiModel,
    BlobUuidModel,
    SqliteRowModel,
    id_bytes_to_string,
    new_id_bytes,
)
from src.common.validation import ChoiceValidator

ORDER_STATUS_SAVED = "saved"
ORDER_STATUS_PAID = "paid"
ORDER_STATUS_CANCELLED = "cancelled"

ORDER_STATUS_VALIDATOR = ChoiceValidator(
    field_name="status",
    choices=(
        ORDER_STATUS_SAVED,
        ORDER_STATUS_PAID,
        ORDER_STATUS_CANCELLED,
    ),
)


@dataclass(slots=True, frozen=True)
class OrderItem(SqliteRowModel):
    order_id: bytes
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
class Order(SqliteRowModel, BlobUuidModel, ApiModel):
    public_fields = ("id", "status", "total_cents", "created_at", "items")

    user_id: bytes
    address_id: bytes | None
    status: str
    total_cents: int
    created_at: str
    updated_at: str
    order_id: bytes = field(default_factory=new_id_bytes)
    items: list[OrderItem] = field(default_factory=list)
    shipping_address_line_one: str | None = None
    address_line_two: str | None = None
    shipping_suburb: str | None = None
    shipping_state: str | None = None
    shipping_postcode: str | None = None
    shipping_country: str | None = None

    def to_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "createdAt": self.created_at,
            "items": [item.to_dict() for item in self.items],
            "shippingAddress": self._formatted_shipping_address(),
            "shippingAddressLineOne": self.shipping_address_line_one,
            "addressLineTwo": self.address_line_two,
            "shippingSuburb": self.shipping_suburb,
            "shippingState": self.shipping_state,
            "shippingPostcode": self.shipping_postcode,
            "shippingCountry": self.shipping_country,
            "status": self.status,
            "totalCents": self.total_cents,
        }

    def _formatted_shipping_address(self) -> str | None:
        parts = [
            self.shipping_address_line_one,
            self.address_line_two,
            self.shipping_suburb,
            self.shipping_state,
            self.shipping_postcode,
            self.shipping_country,
        ]
        filtered = [p for p in parts if p]
        return ", ".join(filtered) if filtered else None
