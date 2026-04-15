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
    PRODUCT_CODE_MAX_LENGTH,
    PRODUCT_MAX_PRICE_CENTS,
    PRODUCT_NAME_MAX_LENGTH,
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
        "created_at",
        "updated_at",
    )

    name: str
    code: str
    price_cents: int
    created_at: str
    updated_at: str
    product_id: bytes = field(default_factory=new_id_bytes)

    @classmethod
    def create(
        cls,
        *,
        name: str,
        code: str,
        price_cents: int,
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
        )

    def updated(
        self,
        *,
        name: str,
        code: str,
        price_cents: int,
        updated_at: str,
    ) -> "Product":
        return Product(
            product_id=self.product_id,
            name=validate_product_name(name),
            code=normalize_product_code(code),
            price_cents=validate_product_price_cents(price_cents),
            created_at=self.created_at,
            updated_at=updated_at,
        )


def validate_product_name(value: str) -> str:
    return ProductName.validate_domain(value)


def normalize_product_code(value: str) -> str:
    return ProductCode.validate_domain(value)


def validate_product_price_cents(value: int) -> int:
    return MoneyAmount.validate_domain_cents(value)
