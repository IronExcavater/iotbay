import random
from dataclasses import dataclass

from src.common.clock import UtcTime
from src.common.web import ApiError
from src.orders.models import ORDER_STATUS_PAID, ORDER_STATUS_SAVED
from src.orders.repository import OrderRepository
from src.payments.models import (
    PAYMENT_STATUS_FAILED,
    PAYMENT_STATUS_SUCCESS,
    Payment,
)
from src.payments.repository import PaymentRepository
from src.payments.requests import PayOrderRequest


@dataclass(slots=True)
class PaymentService:
    payment_repository: PaymentRepository
    order_repository: OrderRepository

    def pay_order(
        self,
        *,
        actor_user_id: bytes,
        order_id: bytes,
        request: PayOrderRequest,
    ) -> Payment:
        """
        Simulate payment for a given order.

        Validates that:
        - The order exists and belongs to the requesting user.
        - The order is in 'saved' status (not already paid or cancelled).

        Then simulates a payment outcome (90 % success / 10 % failure for demo
        purposes).  On success the order status is updated to 'paid' and a
        payment record is persisted.  On failure a payment record with
        status 'failed' is persisted and an error is returned.
        """

        # --- Validate the order ---
        order = self.order_repository.select_order_by_id(order_id)
        if order is None or order.user_id != actor_user_id:
            raise ApiError("Order not found", 404, code="ORDER_NOT_FOUND")

        if order.status == ORDER_STATUS_PAID:
            raise ApiError(
                "Order has already been paid",
                409,
                code="ORDER_ALREADY_PAID",
            )

        if order.status != ORDER_STATUS_SAVED:
            raise ApiError(
                f"Cannot pay an order with status '{order.status}'",
                409,
                code="ORDER_NOT_PAYABLE",
            )

        # --- Extract card last four to check legit ---
        card_last_four = request.card_number[-4:]

        # --- Simulate payment gateway (just like a third party payment service)---
        now_iso = UtcTime.now().iso
        simulated_success = self._simulate_payment(request.card_number)

        status = PAYMENT_STATUS_SUCCESS if simulated_success else PAYMENT_STATUS_FAILED

        payment = self.payment_repository.insert_payment(
            order_id=order_id,
            user_id=actor_user_id,
            amount_cents=order.total_cents,
            status=status,
            card_last_four=card_last_four,
            card_holder=request.card_holder,
            paid_at=now_iso,
        )

        if simulated_success:
            self.order_repository.update_order_status(
                order_id=order_id,
                new_status=ORDER_STATUS_PAID,
            )
        else:
            raise ApiError(
                "Payment was declined by the simulated gateway",
                402,
                code="PAYMENT_DECLINED",
            )

        return payment

    # ------------------------------------------------------------------
    # Card check helpers (return fault if card ending by 0000)
    # ------------------------------------------------------------------

    @staticmethod
    def _simulate_payment(card_number: str) -> bool:
        """
        Simulate a payment outcome.

        A card number ending in '0000' always fails.
        
        """
        if card_number.endswith("0000"):
            return False
        return random.random() < 0.9  # noqa: S311  (not cryptographic)
