import json
import sqlite3
from dataclasses import dataclass, field

from src.common.sqlite_model import (
    ApiModel,
    BlobUuidModel,
    SqliteRowModel,
    new_id_bytes,
)
from src.common.types import (
    MoneyAmount,
    ProductCode,
    ProductName,
)

ENTITY_TYPE_PRODUCT = "product"

PRODUCT_NAME_VALIDATOR = ProductName.VALIDATOR
PRODUCT_CODE_VALIDATOR = ProductCode.VALIDATOR
PRODUCT_PRICE_VALIDATOR = MoneyAmount.VALIDATOR


@dataclass(slots=True, frozen=True)
class Product(SqliteRowModel, BlobUuidModel, ApiModel):
    public_fields = (
        "id",
        "name",
        "code",
        "price_cents",
        "description",
        "media_urls",
        "type",
        "stock",
        "stock_status_message",
        "stock_status_tone",
        "created_at",
        "updated_at",
    )

    name: str
    code: str
    price_cents: int
    created_at: str
    updated_at: str
    description: str = ""
    media_urls_json: str = "[]"
    type: str = ""
    stock: int = 0
    product_id: bytes = field(default_factory=new_id_bytes)

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "Product":
        product = super().from_row(row)
        return cls(
            product_id=product.product_id,
            name=product.name,
            code=product.code,
            price_cents=product.price_cents,
            created_at=product.created_at,
            updated_at=product.updated_at,
            description=product.description,
            media_urls_json=product.media_urls_json,
            type=normalize_product_type(product.type),
            stock=normalize_product_stock(product.stock),
        )

    @classmethod
    def create(
        cls,
        *,
        name: str,
        code: str,
        media_urls: list[str],
        price_cents: int,
        type: str,
        stock: int,
        now_iso: str,
    ) -> "Product":
        normalized_name = validate_product_name(name)
        normalized_code = normalize_product_code(code)
        validated_price = validate_product_price_cents(price_cents)
        return cls(
            name=normalized_name,
            code=normalized_code,
            price_cents=validated_price,
            created_at=now_iso,
            updated_at=now_iso,
            description="",
            media_urls_json=json.dumps(normalize_media_urls(media_urls)),
            type=normalize_product_type(type),
            stock=normalize_product_stock(stock),
        )

    def updated(
        self,
        *,
        name: str,
        code: str,
        media_urls: list[str],
        price_cents: int,
        type: str,
        stock: int,
        updated_at: str,
    ) -> "Product":
        return Product(
            product_id=self.product_id,
            name=validate_product_name(name),
            code=normalize_product_code(code),
            price_cents=validate_product_price_cents(price_cents),
            created_at=self.created_at,
            updated_at=updated_at,
            description=self.description,
            media_urls_json=json.dumps(normalize_media_urls(media_urls)),
            type=normalize_product_type(type),
            stock=normalize_product_stock(stock),
        )

    @property
    def media_urls(self) -> list[str]:
        try:
            parsed = json.loads(self.media_urls_json or "[]")
        except json.JSONDecodeError:
            return []

        if not isinstance(parsed, list):
            return []

        return [item for item in parsed if isinstance(item, str) and item.strip()]

    def snapshot(self) -> dict[str, object]:
        return {
            "code": self.code,
            "description": self.description,
            "mediaUrls": self.media_urls,
            "name": self.name,
            "priceCents": self.price_cents,
            "stock": self.stock,
            "type": self.type,
        }

    @property
    def stock_status_message(self) -> str | None:
        if self.stock > 10:
            return None
        if self.stock == 0:
            return "Out of stock"
        if self.stock >= 5:
            return f"Limited stock: {self.stock} available"
        if self.stock == 1:
            return "Last unit available"
        return f"Only {self.stock} left in stock"

    @property
    def stock_status_tone(self) -> str | None:
        if self.stock > 10:
            return None
        if self.stock >= 5:
            return "warning"
        return "critical"


def validate_product_name(value: str) -> str:
    return ProductName.validate_domain(value)


def normalize_product_code(value: str) -> str:
    return ProductCode.validate_domain(value)


def validate_product_price_cents(value: int) -> int:
    return MoneyAmount.validate_domain_cents(value)


def validate_product_type(value: str) -> str:
    normalized_value = value.strip()
    if not normalized_value:
        raise ValueError("type is required")
    return normalized_value


def validate_product_stock(value: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError("stock must be zero or greater")
    return value


def normalize_product_type(value: object) -> str:
    return validate_product_type(value) if isinstance(value, str) else ""


def normalize_product_stock(value: object) -> int:
    return validate_product_stock(value) if isinstance(value, int) else 0


def normalize_media_urls(value: list[str]) -> list[str]:
    return [item.strip() for item in value if item.strip()][:6]
