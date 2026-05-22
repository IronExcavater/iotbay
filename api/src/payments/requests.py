from pydantic import BaseModel, Field, field_validator, model_validator


class PayOrderRequest(BaseModel):
    """
    Simulated payment request.

    Option A — pay with a saved payment method:
        { "paymentMethodId": "<uuid>" }

    Option B — pay with raw card details:
        { "cardNumber": "4111...", "cardHolder": "Jane", "expiry": "12/28" }

    Both options may be supplied together; paymentMethodId takes priority for
    linking the payment record, but card details are still validated.
    """

    # NEW: optional saved payment method reference
    payment_method_id: str | None = Field(default=None, alias="paymentMethodId")

    card_number: str | None = Field(default=None, alias="cardNumber")
    card_holder: str | None = Field(default=None, alias="cardHolder")
    expiry: str | None = Field(default=None)

    # Field-level validators (only run when the field is not None)

    @field_validator("card_number")
    @classmethod
    def validate_card_number(cls, v: str | None) -> str | None:
        if v is None:
            return None
        digits = v.replace(" ", "").replace("-", "")
        if not digits.isdigit() or len(digits) < 13 or len(digits) > 19:
            raise ValueError("card number must be 13–19 digits")
        return digits

    @field_validator("card_holder")
    @classmethod
    def validate_card_holder(cls, v: str | None) -> str | None:
        if v is None:
            return None
        stripped = v.strip()
        if not stripped:
            raise ValueError("card holder name is required")
        return stripped

    @field_validator("expiry")
    @classmethod
    def validate_expiry(cls, v: str | None) -> str | None:
        if v is None:
            return None
        parts = v.strip().split("/")
        if len(parts) != 2 or not parts[0].isdigit() or not parts[1].isdigit():
            raise ValueError("expiry must be in MM/YY format")
        month = int(parts[0])
        if month < 1 or month > 12:
            raise ValueError("expiry month must be between 01 and 12")
        return v.strip()

    # NEW: cross-field validation
    # If no saved method is provided, all raw card fields are required.

    @model_validator(mode="after")
    def require_card_details_when_no_saved_method(self) -> "PayOrderRequest":
        if self.payment_method_id is None:
            missing = []
            if not self.card_number:
                missing.append("cardNumber")
            if not self.card_holder:
                missing.append("cardHolder")
            if not self.expiry:
                missing.append("expiry")
            if missing:
                raise ValueError(
                    f"card details are required when no paymentMethodId is provided: "
                    f"{', '.join(missing)}"
                )
        return self

    class Config:
        populate_by_name = True
