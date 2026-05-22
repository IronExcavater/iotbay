from pydantic import BaseModel, Field, field_validator
from src.orders.models import ORDER_STATUS_VALIDATOR


class OrderItemRequest(BaseModel):
    product_id: str = Field(alias="productId")
    quantity: int

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v):
        if v < 1:
            raise ValueError("quantity must be at least 1")
        return v

    class Config:
        populate_by_name = True


class CreateOrderRequest(BaseModel):
    items: list[OrderItemRequest]
    address_id: str | None = Field(alias="addressId")

    @field_validator("items")
    @classmethod
    def validate_items(cls, v):
        if not v:
            raise ValueError("at least one item is required")
        return v

    class Config:
        populate_by_name = True


class UpdateOrderStatusRequest(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        ORDER_STATUS_VALIDATOR.validate_request(v)
        return v

    class Config:
        populate_by_name = True


class UpdateOrderAddressRequest(BaseModel):
    address_line_one: str | None = Field(None, alias="addressLineOne")
    address_line_two: str | None = Field(None, alias="addressLineTwo")
    suburb: str | None = Field(None)
    state: str | None = Field(None)
    postcode: str | None = Field(None)
    country: str | None = Field(None)

    class Config:
        populate_by_name = True
