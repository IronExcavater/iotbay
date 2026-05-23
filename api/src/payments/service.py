import random
from dataclasses import dataclass

from src.common.clock import UtcTime
from src.common.sqlite_model import id_string_to_bytes
from src.common.web import ApiError
from src.orders.models import ORDER_STATUS_PAID, ORDER_STATUS_SAVED
from src.orders.repository import OrderRepository
from src.payment_methods.repository import PaymentMethodRepository  # NEW
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
    payment_method_repository: PaymentMethodRepository  # NEW

    def pay_order(
        self,
        *,
        actor_user_id: bytes,
        order_id: bytes,
        request: PayOrderRequest,
    ) -> Payment:
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

        # --- Resolve card details ---
        # NEW BLOCK: if a saved payment method is provided, load it and use
        # its stored card_last4 / cardholder_name instead of the raw request fields.
        payment_method_id_bytes: bytes | None = None
        card_last4: str
        card_holder: str

        if request.payment_method_id is not None:
            # Look up the saved payment method and verify ownership
            saved_methods = self.payment_method_repository.list_payment_methods(
                actor_user_id
            )
            matched = next(
                (m for m in saved_methods if m["id"] == request.payment_method_id),
                None,
            )
            if matched is None:
                raise ApiError(
                    "Payment method not found",
                    404,
                    code="PAYMENT_METHOD_NOT_FOUND",
                )
            card_last4 = matched["cardLast4"]
            card_holder = matched["cardholderName"]
            payment_method_id_bytes = id_string_to_bytes(request.payment_method_id)
        else:
            # Raw card details — card_number is guaranteed non-None by the
            # model_validator in PayOrderRequest
            assert request.card_number is not None  # noqa: S101
            assert request.card_holder is not None  # noqa: S101
            card_last4 = request.card_number[-4:]
            card_holder = request.card_holder

        # --- Simulate payment gateway ---
        # Use card_last4 for the deterministic fail rule (ends in 0000)
        now_iso = UtcTime.now().iso
        simulated_success = self._simulate_payment(card_last4)

        status = PAYMENT_STATUS_SUCCESS if simulated_success else PAYMENT_STATUS_FAILED

        payment = self.payment_repository.insert_payment(
            order_id=order_id,
            user_id=actor_user_id,
            amount_cents=order.total_cents,
            status=status,
            card_last4=card_last4,  # CHANGED: was card_last_four
            card_holder=card_holder,
            paid_at=now_iso,
            payment_method_id=payment_method_id_bytes,  # NEW
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

    # Private helpers

    @staticmethod
    def _simulate_payment(card_last4: str) -> bool:  # CHANGED param name
        """
        Simulate a payment outcome.

        A card whose last 4 digits are '0000' always fails (useful for testing).
        Otherwise there is a 90 % success rate.
        """
        if card_last4 == "0000":
            return False
        return random.random() < 0.9  # noqa: S311
