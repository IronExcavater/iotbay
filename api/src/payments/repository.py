from src.common.repository import Repository
from src.payments.models import Payment
from src.payments.queries import (
    INSERT_PAYMENT,
    SELECT_PAYMENT_BY_ORDER_ID,
    SELECT_PAYMENTS_BY_USER_ID,
)


class PaymentRepository(Repository):
    def __init__(self, database_path: str) -> None:
        super().__init__(database_path)

    def insert_payment(
        self,
        *,
        order_id: bytes,
        user_id: bytes,
        amount_cents: int,
        status: str,
        card_last4: str,  # CHANGED: was card_last_four
        card_holder: str,
        paid_at: str,
        payment_method_id: bytes | None = None,  # NEW: optional saved method link
    ) -> Payment:
        from src.common.sqlite_model import new_id_bytes

        payment_id = new_id_bytes()
        payment = Payment(
            payment_id=payment_id,
            order_id=order_id,
            user_id=user_id,
            payment_method_id=payment_method_id,  # NEW
            amount_cents=amount_cents,
            status=status,
            card_last4=card_last4,  # CHANGED: was card_last_four
            card_holder=card_holder,
            paid_at=paid_at,
        )
        with self.connect() as connection:
            connection.execute(
                INSERT_PAYMENT,
                (
                    payment.payment_id,
                    payment.order_id,
                    payment.user_id,
                    payment.payment_method_id,  # NEW (4th positional, may be None)
                    payment.amount_cents,
                    payment.status,
                    payment.card_last4,  # CHANGED: was card_last_four
                    payment.card_holder,
                    payment.paid_at,
                ),
            )
        return payment

    def select_payment_by_order_id(self, order_id: bytes) -> Payment | None:
        with self.connect() as connection:
            row = connection.execute(SELECT_PAYMENT_BY_ORDER_ID, (order_id,)).fetchone()
        return Payment(**row) if row is not None else None

    def list_payments_by_user_id(self, user_id: bytes) -> list[Payment]:
        with self.connect() as connection:
            rows = connection.execute(SELECT_PAYMENTS_BY_USER_ID, (user_id,)).fetchall()
        return [Payment(**row) for row in rows]
