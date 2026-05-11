from pydantic import BaseModel, Field


class PaymentMethodRequest(BaseModel):
    type: str
    cardholder_name: str = Field(alias="cardholderName")
    card_number: str = Field(alias="cardNumber")
    expiry: str

    class Config:
        populate_by_name = True
