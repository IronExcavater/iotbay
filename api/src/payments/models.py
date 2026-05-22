from dataclasses import dataclass, field

from src.common.sqlite_model import (
    ApiModel,
    BlobUuidModel,
    SqliteRowModel,
    id_bytes_to_string,
    new_id_bytes,
)

PAYMENT_STATUS_SUCCESS = "success"
PAYMENT_STATUS_FAILED = "failed"


@dataclass(slots=True, frozen=True)
class Payment(SqliteRowModel, BlobUuidModel, ApiModel):
    public_fields = (
        "id",
        "order_id",
        "amount_cents",
        "status",
        "card_last_four",
        "card_holder",
        "paid_at",
    )

    order_id: bytes
    user_id: bytes
    amount_cents: int
    status: str
    card_last_four: str
    card_holder: str
    paid_at: str
    payment_id: bytes = field(default_factory=new_id_bytes)

    def to_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "orderId": id_bytes_to_string(self.order_id),
            "amountCents": self.amount_cents,
            "status": self.status,
            "cardLastFour": self.card_last_four,
            "cardHolder": self.card_holder,
            "paidAt": self.paid_at,
        }
