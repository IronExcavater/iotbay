from pydantic import BaseModel, Field, field_validator


class AddCartItemRequest(BaseModel):
    product_id: str = Field(alias="productId")
    quantity: int = 1

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v):
        if v < 1:
            raise ValueError("quantity must be at least 1")
        return v

    class Config:
        populate_by_name = True
