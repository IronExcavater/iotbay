"""
Unit tests for the payments module.

Covers:
  - PaymentService.pay_order() happy path (success)
  - PaymentService.pay_order() always-fail card
  - Validation: order not found / wrong owner
  - Validation: order already paid
  - Validation: order in non-payable state (cancelled)
  - PaymentRepository: insert and read-back
  - PayOrderRequest validation (card number, expiry, holder)
"""
import unittest
from unittest.mock import patch

from src.auth.security import hash_password
from src.common.app import extension_from, services_from
from src.orders.models import (
    ORDER_STATUS_CANCELLED,
    ORDER_STATUS_PAID,
    ORDER_STATUS_SAVED,
)
from src.payments.models import PAYMENT_STATUS_FAILED, PAYMENT_STATUS_SUCCESS
from src.payments.requests import PayOrderRequest
from src.payments.service import PaymentService
from src.users.models import USER_STATUS_ACTIVE, USER_TYPE_CUSTOMER
from src.users.repository import UserRepository

from test.unit.helpers.app_case import AppTestCase
from test.unit.helpers.session_factory import create_test_session


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _pay_request(
    *,
    card_number: str = "4111111111111111",
    card_holder: str = "Jane Smith",
    expiry: str = "12/28",
) -> PayOrderRequest:
    return PayOrderRequest(
        cardNumber=card_number,
        cardHolder=card_holder,
        expiry=expiry,
    )


def _create_order(client, *, user_id: bytes, status: str = ORDER_STATUS_SAVED):
    """Create a minimal order directly through the repository."""
    from src.common.sqlite_model import new_id_bytes
    from src.common.clock import UtcTime
    from src.db import connect
    from src.common.app import services_from

    svc = services_from(client.application)
    # Use a real product so FK constraints hold
    product = svc.product_repository.select_products()[0] if hasattr(
        svc.product_repository, "select_products"
    ) else None

    order = svc.order_repository.insert_order(
        user_id=user_id,
        address_id=None,
        items=[],          # empty items are fine for payment tests
        total_cents=4999,
    )

    if status != ORDER_STATUS_SAVED:
        order = svc.order_repository.update_order_status(
            order_id=order.order_id,
            new_status=status,
        )

    return order


# ---------------------------------------------------------------------------
# PayOrderRequest validation tests (pure Python, no DB needed)
# ---------------------------------------------------------------------------

class PayOrderRequestValidationTestCase(unittest.TestCase):
    def test_valid_request_passes(self) -> None:
        req = PayOrderRequest(
            cardNumber="4111111111111111",
            cardHolder="Alice",
            expiry="01/30",
        )
        self.assertEqual(req.card_number, "4111111111111111")
        self.assertEqual(req.card_holder, "Alice")
        self.assertEqual(req.expiry, "01/30")

    def test_card_number_too_short_raises(self) -> None:
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            PayOrderRequest(cardNumber="123", cardHolder="Alice", expiry="01/30")

    def test_non_digit_card_number_raises(self) -> None:
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            PayOrderRequest(cardNumber="abcdefghijkl", cardHolder="Alice", expiry="01/30")

    def test_blank_card_holder_raises(self) -> None:
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            PayOrderRequest(
                cardNumber="4111111111111111",
                cardHolder="   ",
                expiry="01/30",
            )

    def test_invalid_expiry_format_raises(self) -> None:
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            PayOrderRequest(
                cardNumber="4111111111111111",
                cardHolder="Alice",
                expiry="13/99",   # month 13 is invalid
            )

    def test_spaces_dashes_stripped_from_card_number(self) -> None:
        req = PayOrderRequest(
            cardNumber="4111 1111 1111 1111",
            cardHolder="Bob",
            expiry="06/27",
        )
        self.assertEqual(req.card_number, "4111111111111111")


# ---------------------------------------------------------------------------
# Payment service / repository integration tests (use a real in-memory DB)
# ---------------------------------------------------------------------------

class PaymentServiceTestCase(AppTestCase):
    def _make_customer(self, email: str = "pay.customer@example.com"):
        repository = extension_from(
            self.client.application, "user_repository", UserRepository
        )
        user = repository.insert_user(
            email=email,
            password_hash=hash_password("CedarGrove42"),
            first_name="Pay",
            last_name="Customer",
            user_type=USER_TYPE_CUSTOMER,
            status=USER_STATUS_ACTIVE,
        )
        return user

    def _make_order(self, user_id: bytes, status: str = ORDER_STATUS_SAVED):
        svc = services_from(self.client.application)
        order = svc.order_repository.insert_order(
            user_id=user_id,
            address_id=None,
            items=[],
            total_cents=4999,
        )
        if status != ORDER_STATUS_SAVED:
            order = svc.order_repository.update_order_status(
                order_id=order.order_id,
                new_status=status,
            )
        return order

    def _payment_service(self) -> PaymentService:
        return services_from(self.client.application).payment_service

    # -----------------------------------------------------------------------
    # Happy-path success
    # -----------------------------------------------------------------------

    def test_pay_order_success_records_payment_and_marks_order_paid(self) -> None:
        """AC: a valid payment succeeds, the order becomes 'paid', and a payment
        record with status 'success' is persisted."""
        user = self._make_customer()
        order = self._make_order(user.user_id)
        svc = self._payment_service()

        with patch(
            "src.payments.service.PaymentService._simulate_payment",
            return_value=True,
        ):
            payment = svc.pay_order(
                actor_user_id=user.user_id,
                order_id=order.order_id,
                request=_pay_request(),
            )

        self.assertEqual(payment.status, PAYMENT_STATUS_SUCCESS)
        self.assertEqual(payment.card_last_four, "1111")
        self.assertEqual(payment.card_holder, "Jane Smith")
        self.assertEqual(payment.amount_cents, 4999)

        updated_order = services_from(
            self.client.application
        ).order_repository.select_order_by_id(order.order_id)
        self.assertIsNotNone(updated_order)
        assert updated_order is not None
        self.assertEqual(updated_order.status, ORDER_STATUS_PAID)

    # -----------------------------------------------------------------------
    # Always-fail card (ends in 0000)
    # -----------------------------------------------------------------------

    def test_always_fail_card_returns_402_and_records_failed_payment(self) -> None:
        """AC: a card number ending in 0000 always declines; a failed payment
        record is persisted and a 402 error is returned."""
        from src.common.web import ApiError

        user = self._make_customer(email="fail.card@example.com")
        order = self._make_order(user.user_id)
        svc = self._payment_service()

        with self.assertRaises(ApiError) as ctx:
            svc.pay_order(
                actor_user_id=user.user_id,
                order_id=order.order_id,
                request=_pay_request(card_number="4111111111110000"),
            )

        self.assertEqual(ctx.exception.status_code, 402)
        self.assertEqual(ctx.exception.code, "PAYMENT_DECLINED")

        # The failed payment record must still be stored
        repo = services_from(self.client.application).payment_repository
        stored = repo.select_payment_by_order_id(order.order_id)
        self.assertIsNotNone(stored)
        assert stored is not None
        self.assertEqual(stored.status, PAYMENT_STATUS_FAILED)

        # Order must NOT have been updated to 'paid'
        unchanged = services_from(
            self.client.application
        ).order_repository.select_order_by_id(order.order_id)
        self.assertIsNotNone(unchanged)
        assert unchanged is not None
        self.assertEqual(unchanged.status, ORDER_STATUS_SAVED)

    # -----------------------------------------------------------------------
    # Order not found / wrong owner
    # -----------------------------------------------------------------------

    def test_pay_order_raises_404_when_order_not_found(self) -> None:
        """AC: paying a non-existent order returns 404."""
        from src.common.sqlite_model import new_id_bytes
        from src.common.web import ApiError

        user = self._make_customer(email="nofound@example.com")
        svc = self._payment_service()

        with self.assertRaises(ApiError) as ctx:
            svc.pay_order(
                actor_user_id=user.user_id,
                order_id=new_id_bytes(),   # random, non-existent ID
                request=_pay_request(),
            )

        self.assertEqual(ctx.exception.status_code, 404)

    def test_pay_order_raises_404_when_order_belongs_to_different_user(self) -> None:
        """AC: a customer cannot pay another customer's order."""
        from src.common.web import ApiError

        owner = self._make_customer(email="owner@example.com")
        other = self._make_customer(email="other@example.com")
        order = self._make_order(owner.user_id)
        svc = self._payment_service()

        with self.assertRaises(ApiError) as ctx:
            svc.pay_order(
                actor_user_id=other.user_id,
                order_id=order.order_id,
                request=_pay_request(),
            )

        self.assertEqual(ctx.exception.status_code, 404)

    # -----------------------------------------------------------------------
    # Already paid
    # -----------------------------------------------------------------------

    def test_pay_order_raises_409_when_order_already_paid(self) -> None:
        """AC: paying an already-paid order returns 409 ALREADY_PAID."""
        from src.common.web import ApiError

        user = self._make_customer(email="already.paid@example.com")
        order = self._make_order(user.user_id, status=ORDER_STATUS_PAID)
        svc = self._payment_service()

        with self.assertRaises(ApiError) as ctx:
            svc.pay_order(
                actor_user_id=user.user_id,
                order_id=order.order_id,
                request=_pay_request(),
            )

        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(ctx.exception.code, "ORDER_ALREADY_PAID")

    # -----------------------------------------------------------------------
    # Non-payable status (cancelled)
    # -----------------------------------------------------------------------

    def test_pay_order_raises_409_when_order_is_cancelled(self) -> None:
        """AC: a cancelled order cannot be paid."""
        from src.common.web import ApiError

        user = self._make_customer(email="cancelled@example.com")
        order = self._make_order(user.user_id, status=ORDER_STATUS_CANCELLED)
        svc = self._payment_service()

        with self.assertRaises(ApiError) as ctx:
            svc.pay_order(
                actor_user_id=user.user_id,
                order_id=order.order_id,
                request=_pay_request(),
            )

        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(ctx.exception.code, "ORDER_NOT_PAYABLE")

    # -----------------------------------------------------------------------
    # Repository: insert and list
    # -----------------------------------------------------------------------

    def test_payment_repository_stores_and_retrieves_payment(self) -> None:
        """AC: inserted payments can be fetched by order_id and by user_id."""
        user = self._make_customer(email="repo.test@example.com")
        order = self._make_order(user.user_id)
        repo = services_from(self.client.application).payment_repository

        inserted = repo.insert_payment(
            order_id=order.order_id,
            user_id=user.user_id,
            amount_cents=order.total_cents,
            status=PAYMENT_STATUS_SUCCESS,
            card_last_four="4242",
            card_holder="Test User",
            paid_at="2026-05-11T10:00:00.000000+00:00",
        )

        by_order = repo.select_payment_by_order_id(order.order_id)
        self.assertIsNotNone(by_order)
        assert by_order is not None
        self.assertEqual(by_order.payment_id, inserted.payment_id)
        self.assertEqual(by_order.card_last_four, "4242")

        by_user = repo.list_payments_by_user_id(user.user_id)
        self.assertEqual(len(by_user), 1)
        self.assertEqual(by_user[0].payment_id, inserted.payment_id)


if __name__ == "__main__":
    unittest.main()
