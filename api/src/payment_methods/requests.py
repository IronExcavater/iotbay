from pydantic import BaseModel, Field, field_validator

ALLOWED_TYPES = {"Visa", "Mastercard"}


class PaymentMethodRequest(BaseModel):
    type: str
    cardholder_name: str = Field(alias="cardholderName")
    card_number: str = Field(alias="cardNumber")
    expiry: str

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in ALLOWED_TYPES:
            raise ValueError(f"type must be one of: {', '.join(sorted(ALLOWED_TYPES))}")
        return v

    @field_validator("cardholder_name")
    @classmethod
    def validate_cardholder_name(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("cardholder name is required")
        return stripped

    @field_validator("card_number")
    @classmethod
    def validate_card_number(cls, v: str) -> str:
        digits = v.replace(" ", "").replace("-", "")
        if not digits.isdigit() or len(digits) < 13 or len(digits) > 19:
            raise ValueError("card number must be 13–19 digits")
        return digits

    @field_validator("expiry")
    @classmethod
    def validate_expiry(cls, v: str) -> str:
        parts = v.strip().split("/")
        if len(parts) != 2 or not parts[0].isdigit() or not parts[1].isdigit():
            raise ValueError("expiry must be in MM/YY format")
        month = int(parts[0])
        if month < 1 or month > 12:
            raise ValueError("expiry month must be between 01 and 12")
        return v.strip()

    class Config:
        populate_by_name = True
