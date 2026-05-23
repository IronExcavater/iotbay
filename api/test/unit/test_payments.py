import sqlite3
import unittest
from unittest.mock import patch

from src.common.app import extension_from, services_from
from src.common.sqlite_model import new_id_bytes
from src.orders.models import (
    ORDER_STATUS_CANCELLED,
    ORDER_STATUS_PAID,
    ORDER_STATUS_SAVED,
)
from src.payments.models import PAYMENT_STATUS_FAILED, PAYMENT_STATUS_SUCCESS
from src.payments.requests import PayOrderRequest
from src.payments.service import PaymentService
from src.users.repository import UserRepository
from test.shared.app import AppTestCase
from test.shared.users import create_customer

SIMULATE = "src.payments.service.PaymentService._simulate_payment"


def _pay_request(
    *,
    card_number: str = "4111111111111111",
    card_holder: str = "Jane Smith",
    expiry: str = "12/28",
    payment_method_id: str | None = None,
) -> PayOrderRequest:
    if payment_method_id:
        return PayOrderRequest(paymentMethodId=payment_method_id)
    return PayOrderRequest(
        cardNumber=card_number,
        cardHolder=card_holder,
        expiry=expiry,
    )


class PayOrderRequestValidationTestCase(unittest.TestCase):
    def test_valid_raw_card_request_passes(self) -> None:
        req = PayOrderRequest(
            cardNumber="4111111111111111",
            cardHolder="Alice",
            expiry="01/30",
        )
        self.assertEqual(req.card_number, "4111111111111111")
        self.assertEqual(req.card_holder, "Alice")

    def test_valid_saved_method_request_passes(self) -> None:
        req = PayOrderRequest(paymentMethodId="some-uuid")
        self.assertEqual(req.payment_method_id, "some-uuid")
        self.assertIsNone(req.card_number)

    def test_no_card_and_no_method_raises(self) -> None:
        from pydantic import ValidationError

        with self.assertRaises(ValidationError):
            PayOrderRequest()

    def test_card_number_too_short_raises(self) -> None:
        from pydantic import ValidationError

        with self.assertRaises(ValidationError):
            PayOrderRequest(
                cardNumber="123",
                cardHolder="Alice",
                expiry="01/30",
            )

    def test_non_digit_card_number_raises(self) -> None:
        from pydantic import ValidationError

        with self.assertRaises(ValidationError):
            PayOrderRequest(
                cardNumber="abcdefghijklm",
                cardHolder="Alice",
                expiry="01/30",
            )

    def test_blank_card_holder_raises(self) -> None:
        from pydantic import ValidationError

        with self.assertRaises(ValidationError):
            PayOrderRequest(
                cardNumber="4111111111111111",
                cardHolder="   ",
                expiry="01/30",
            )

    def test_invalid_expiry_month_raises(self) -> None:
        from pydantic import ValidationError

        with self.assertRaises(ValidationError):
            PayOrderRequest(
                cardNumber="4111111111111111",
                cardHolder="Alice",
                expiry="13/99",
            )

    def test_spaces_stripped_from_card_number(self) -> None:
        req = PayOrderRequest(
            cardNumber="4111 1111 1111 1111",
            cardHolder="Bob",
            expiry="06/27",
        )
        self.assertEqual(req.card_number, "4111111111111111")


class PaymentServiceTestCase(AppTestCase):
    def _make_customer(self, email: str = "pay.customer@example.com"):
        repo = extension_from(
            self.client.application, "user_repository", UserRepository
        )
        return create_customer(repo, email=email, password="CedarGrove42")

    def _make_order(
        self, user_id: bytes, status: str = ORDER_STATUS_SAVED
    ):
        """
        Insert a minimal order directly via raw SQL.
        OrderRepository has no insert method — orders are normally created
        through the order service which requires cart items. Raw SQL with
        foreign keys disabled is the simplest way to get a test order into
        the database without depending on unrelated features.
        """
        order_id = new_id_bytes()
        with sqlite3.connect(self.database_path) as conn:
            conn.execute("PRAGMA foreign_keys = OFF")
            conn.execute(
                """
                INSERT INTO orders
                    (order_id, user_id, status, total_cents,
                     created_at, updated_at)
                VALUES
                    (?, ?, ?, ?, datetime('now'), datetime('now'))
                """,
                (order_id, user_id, status, 4999),
            )

        svc = services_from(self.client.application)
        order = svc.order_repository.select_order_by_id(order_id)
        assert order is not None
        return order

    def _payment_service(self) -> PaymentService:
        return services_from(self.client.application).payment_service

    def test_pay_order_success_records_payment_and_marks_order_paid(
        self,
    ) -> None:
        """AC: valid payment succeeds, order becomes paid."""
        test_user = self._make_customer()
        order = self._make_order(test_user.user.user_id)
        svc = self._payment_service()

        with patch(SIMULATE, return_value=True):
            payment = svc.pay_order(
                actor_user_id=test_user.user.user_id,
                order_id=order.order_id,
                request=_pay_request(),
            )

        self.assertEqual(payment.status, PAYMENT_STATUS_SUCCESS)
        self.assertEqual(payment.card_last4, "1111")
        self.assertEqual(payment.card_holder, "Jane Smith")
        self.assertEqual(payment.amount_cents, 4999)
        self.assertIsNone(payment.payment_method_id)

        updated = services_from(
            self.client.application
        ).order_repository.select_order_by_id(order.order_id)
        assert updated is not None
        self.assertEqual(updated.status, ORDER_STATUS_PAID)

    def test_pay_order_with_saved_payment_method_succeeds(self) -> None:
        """AC: paying with a saved method links the payment record."""
        test_user = self._make_customer(email="saved.method@example.com")
        order = self._make_order(test_user.user.user_id)

        repo = services_from(
            self.client.application
        ).payment_method_repository
        method = repo.insert_payment_method(
            customer_id=test_user.user.user_id,
            type="visa",
            cardholder_name="Jane Smith",
            card_last4="4242",
            expiry="12/28",
        )
        method_id = method["id"]

        svc = self._payment_service()
        with patch(SIMULATE, return_value=True):
            payment = svc.pay_order(
                actor_user_id=test_user.user.user_id,
                order_id=order.order_id,
                request=_pay_request(payment_method_id=method_id),
            )

        self.assertEqual(payment.status, PAYMENT_STATUS_SUCCESS)
        self.assertEqual(payment.card_last4, "4242")
        self.assertEqual(payment.card_holder, "Jane Smith")
        self.assertIsNotNone(payment.payment_method_id)

    def test_pay_with_nonexistent_saved_method_raises_404(self) -> None:
        """AC: unknown payment_method_id returns 404."""
        from src.common.web import ApiError

        test_user = self._make_customer(email="nomethod@example.com")
        order = self._make_order(test_user.user.user_id)
        svc = self._payment_service()

        with self.assertRaises(ApiError) as ctx:
            svc.pay_order(
                actor_user_id=test_user.user.user_id,
                order_id=order.order_id,
                request=_pay_request(
                    payment_method_id=(
                        "00000000-0000-0000-0000-000000000001"
                    )
                ),
            )

        self.assertEqual(ctx.exception.status_code, 404)
        self.assertEqual(ctx.exception.code, "PAYMENT_METHOD_NOT_FOUND")

    def test_always_fail_card_returns_402_and_records_failed_payment(
        self,
    ) -> None:
        """AC: card ending 0000 always declines; order unchanged."""
        from src.common.web import ApiError

        test_user = self._make_customer(email="fail.card@example.com")
        order = self._make_order(test_user.user.user_id)
        svc = self._payment_service()

        with self.assertRaises(ApiError) as ctx:
            svc.pay_order(
                actor_user_id=test_user.user.user_id,
                order_id=order.order_id,
                request=_pay_request(card_number="4111111111110000"),
            )

        self.assertEqual(ctx.exception.status_code, 402)
        self.assertEqual(ctx.exception.code, "PAYMENT_DECLINED")

        stored = services_from(
            self.client.application
        ).payment_repository.select_payment_by_order_id(order.order_id)
        self.assertIsNotNone(stored)
        assert stored is not None
        self.assertEqual(stored.status, PAYMENT_STATUS_FAILED)

        unchanged = services_from(
            self.client.application
        ).order_repository.select_order_by_id(order.order_id)
        assert unchanged is not None
        self.assertEqual(unchanged.status, ORDER_STATUS_SAVED)

    def test_pay_order_raises_404_when_order_not_found(self) -> None:
        from src.common.web import ApiError

        test_user = self._make_customer(email="nofound@example.com")

        with self.assertRaises(ApiError) as ctx:
            self._payment_service().pay_order(
                actor_user_id=test_user.user.user_id,
                order_id=new_id_bytes(),
                request=_pay_request(),
            )
        self.assertEqual(ctx.exception.status_code, 404)

    def test_pay_order_raises_404_when_order_belongs_to_other_user(
        self,
    ) -> None:
        from src.common.web import ApiError

        owner = self._make_customer(email="owner@example.com")
        other = self._make_customer(email="other@example.com")
        order = self._make_order(owner.user.user_id)

        with self.assertRaises(ApiError) as ctx:
            self._payment_service().pay_order(
                actor_user_id=other.user.user_id,
                order_id=order.order_id,
                request=_pay_request(),
            )
        self.assertEqual(ctx.exception.status_code, 404)

    def test_pay_already_paid_order_raises_409(self) -> None:
        from src.common.web import ApiError

        test_user = self._make_customer(email="already.paid@example.com")
        order = self._make_order(
            test_user.user.user_id, status=ORDER_STATUS_PAID
        )

        with self.assertRaises(ApiError) as ctx:
            self._payment_service().pay_order(
                actor_user_id=test_user.user.user_id,
                order_id=order.order_id,
                request=_pay_request(),
            )
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(ctx.exception.code, "ORDER_ALREADY_PAID")

    def test_pay_cancelled_order_raises_409(self) -> None:
        from src.common.web import ApiError

        test_user = self._make_customer(email="cancelled@example.com")
        order = self._make_order(
            test_user.user.user_id, status=ORDER_STATUS_CANCELLED
        )

        with self.assertRaises(ApiError) as ctx:
            self._payment_service().pay_order(
                actor_user_id=test_user.user.user_id,
                order_id=order.order_id,
                request=_pay_request(),
            )
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(ctx.exception.code, "ORDER_NOT_PAYABLE")

    def test_payment_repository_stores_and_retrieves_payment(self) -> None:
        test_user = self._make_customer(email="repo.test@example.com")
        order = self._make_order(test_user.user.user_id)
        repo = services_from(self.client.application).payment_repository

        inserted = repo.insert_payment(
            order_id=order.order_id,
            user_id=test_user.user.user_id,
            amount_cents=order.total_cents,
            status=PAYMENT_STATUS_SUCCESS,
            card_last4="4242",
            card_holder="Test User",
            paid_at="2026-05-11T10:00:00.000000+00:00",
        )

        by_order = repo.select_payment_by_order_id(order.order_id)
        self.assertIsNotNone(by_order)
        assert by_order is not None
        self.assertEqual(by_order.payment_id, inserted.payment_id)
        self.assertEqual(by_order.card_last4, "4242")

        by_user = repo.list_payments_by_user_id(test_user.user.user_id)
        self.assertEqual(len(by_user), 1)
        self.assertEqual(by_user[0].payment_id, inserted.payment_id)


if __name__ == "__main__":
    unittest.main()