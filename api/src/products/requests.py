from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel
from src.common.pydantic import ApiRequestModel
from src.common.types import MoneyAmount, ProductCode, ProductName
from src.products.models import (
    validate_product_stock,
    validate_product_type,
)


class ProductRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        str_strip_whitespace=True,
    )


class ProductListQuery(ProductRequest):
    q: str = ""
    type: str = ""
    page: int = 1


class ProductMutationRequest(ApiRequestModel):
    code: str
    media_urls: list[str] = Field(default_factory=list)
    name: str
    price_cents: int
    stock: int = 0
    type: str = ""

    @field_validator("name")
    @classmethod
    def require_name(cls, value: str) -> str:
        return ProductName.validate_request(value)

    @field_validator("code")
    @classmethod
    def require_code(cls, value: str) -> str:
        return ProductCode.validate_request(value)

    @field_validator("price_cents")
    @classmethod
    def require_price_cents(cls, value: int) -> int:
        return MoneyAmount.validate_request_cents(value)

    @field_validator("type")
    @classmethod
    def require_type(cls, value: str) -> str:
        return validate_product_type(value)

    @field_validator("stock")
    @classmethod
    def require_stock(cls, value: int) -> int:
        return validate_product_stock(value)

    @field_validator("media_urls")
    @classmethod
    def normalize_media_urls(cls, value: list[str]) -> list[str]:
        urls = [item.strip() for item in value if item.strip()]
        return urls[:6]
