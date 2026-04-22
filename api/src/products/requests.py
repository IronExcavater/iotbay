from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel
from src.common.types import MoneyAmount, ProductCode, ProductName


class ProductRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        str_strip_whitespace=True,
    )


class ProductMutationRequest(ProductRequest):
    code: str
    name: str
    price_cents: int

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
