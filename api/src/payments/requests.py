from pydantic import BaseModel, Field, field_validator


class PayOrderRequest(BaseModel):
    """
    Simulated payment request.

    card_number: full card number string (last 4 digits extracted server-side)
    card_holder: name on the card
    expiry:      MM/YY format (validated but not used further in simulation)
    """

    card_number: str = Field(alias="cardNumber")
    card_holder: str = Field(alias="cardHolder")
    expiry: str

    @field_validator("card_number")
    @classmethod
    def validate_card_number(cls, v: str) -> str:
        digits = v.replace(" ", "").replace("-", "")
        if not digits.isdigit() or len(digits) < 13 or len(digits) > 19:
            raise ValueError("card number must be 13–19 digits")
        return digits

    @field_validator("card_holder")
    @classmethod
    def validate_card_holder(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("card holder name is required")
        return stripped

    @field_validator("expiry")
    @classmethod
    def validate_expiry(cls, v: str) -> str:
        # Accept MM/YY or MM/YYYY
        parts = v.strip().split("/")
        if len(parts) != 2 or not parts[0].isdigit() or not parts[1].isdigit():
            raise ValueError("expiry must be in MM/YY format")
        month = int(parts[0])
        if month < 1 or month > 12:
            raise ValueError("expiry month must be between 01 and 12")
        return v.strip()

    class Config:
        populate_by_name = True
