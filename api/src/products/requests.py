from typing import ClassVar

from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel
from src.common.validation import NumberValidator
from src.products.models import PRODUCT_CODE_VALIDATOR, PRODUCT_NAME_VALIDATOR


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

    PRICE_CENTS_VALIDATOR: ClassVar[NumberValidator] = NumberValidator(
        field_name="priceCents"
    )

    @field_validator("name")
    @classmethod
    def require_name(cls, value: str) -> str:
        return PRODUCT_NAME_VALIDATOR.validate_request(value)

    @field_validator("code")
    @classmethod
    def require_code(cls, value: str) -> str:
        return PRODUCT_CODE_VALIDATOR.validate_request(value)

    @field_validator("price_cents")
    @classmethod
    def require_price_cents(cls, value: int) -> int:
        return cls.PRICE_CENTS_VALIDATOR.validate_request(value)
