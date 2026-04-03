from dataclasses import dataclass, field

from src.common.sqlite_model import (
    ApiModel,
    BlobUuidModel,
    SqliteRowModel,
    new_id_bytes,
)
from src.common.validation import MoneyValidator, StringValidator

ENTITY_TYPE_PRODUCT = "product"
PRODUCT_CODE_MAX_LENGTH = 32
PRODUCT_NAME_MAX_LENGTH = 120
PRODUCT_MAX_PRICE_CENTS = 100_000_000

PRODUCT_NAME_VALIDATOR = StringValidator(
    field_name="name",
    required=True,
    max_length=PRODUCT_NAME_MAX_LENGTH,
    ascii_only=True,
    printable_ascii_only=True,
    required_code="PRODUCT_NAME_REQUIRED",
    too_long_code="PRODUCT_NAME_TOO_LONG",
    invalid_code="PRODUCT_NAME_INVALID",
)
PRODUCT_CODE_VALIDATOR = StringValidator(
    field_name="code",
    required=True,
    max_length=PRODUCT_CODE_MAX_LENGTH,
    ascii_only=True,
    printable_ascii_only=True,
    uppercase=True,
    required_code="PRODUCT_CODE_REQUIRED",
    too_long_code="PRODUCT_CODE_TOO_LONG",
    invalid_code="PRODUCT_CODE_INVALID",
)
PRODUCT_PRICE_VALIDATOR = MoneyValidator(
    field_name="price",
    min_value=0,
    max_value=PRODUCT_MAX_PRICE_CENTS,
    too_small_code="PRODUCT_PRICE_INVALID",
    too_large_code="PRODUCT_PRICE_TOO_LARGE",
)


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
    return PRODUCT_NAME_VALIDATOR.validate_domain(value)


def normalize_product_code(value: str) -> str:
    return PRODUCT_CODE_VALIDATOR.validate_domain(value)


def validate_product_price_cents(value: int) -> int:
    return PRODUCT_PRICE_VALIDATOR.validate_domain(value)
