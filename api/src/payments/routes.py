from http import HTTPStatus

from flask import Blueprint
from flask.typing import ResponseReturnValue
from src.auth.session import current_authenticated_user
from src.common.app import services
from src.common.sqlite_model import id_string_to_bytes
from src.common.web import ApiError, parse_request
from src.payments.requests import PayOrderRequest

payments_bp = Blueprint("payments", __name__)


def _require_customer():
    user = current_authenticated_user()
    if not user:
        raise ApiError("Authentication required", HTTPStatus.UNAUTHORIZED)
    if user.user_type != "customer":
        raise ApiError("Only customers can make payments", HTTPStatus.FORBIDDEN)
    return user


# POST /api/orders/<order_id>/pay
# Pay with raw card details OR with a saved paymentMethodId in the body


@payments_bp.post("/orders/<order_id>/pay")
def pay_order(order_id: str) -> ResponseReturnValue:
    """
    POST /api/orders/<order_id>/pay

    Option A — raw card details:
        { "cardNumber": "4111...", "cardHolder": "Jane", "expiry": "12/28" }

    Option B — saved payment method:
        { "paymentMethodId": "<uuid>" }

    Option C — both (saved method used for linking, raw fields validated):
        { "paymentMethodId": "<uuid>", "cardNumber": "...", ... }
    """
    user = _require_customer()
    order_id_bytes = id_string_to_bytes(order_id)
    req = parse_request(PayOrderRequest)

    payment = services().payment_service.pay_order(
        actor_user_id=user.user_id,
        order_id=order_id_bytes,
        request=req,
    )
    return payment.to_dict(), HTTPStatus.OK


# POST /api/payment-methods/<method_id>/pay/<order_id> match with new paymentmethod
# Convenience endpoint: pay an order directly from a saved method URL


@payments_bp.post("/payment-methods/<method_id>/pay/<order_id>")
def pay_order_with_saved_method(method_id: str, order_id: str) -> ResponseReturnValue:
    """
    POST /api/payment-methods/<method_id>/pay/<order_id>

    Pay an order using a saved payment method without supplying card details
    in the body.  The body can be empty ({}) since the method is identified
    by the URL.
    """
    user = _require_customer()
    order_id_bytes = id_string_to_bytes(order_id)

    # Build a request that uses the saved method
    req = PayOrderRequest(paymentMethodId=method_id)

    payment = services().payment_service.pay_order(
        actor_user_id=user.user_id,
        order_id=order_id_bytes,
        request=req,
    )
    return payment.to_dict(), HTTPStatus.OK


# GET /api/orders/<order_id>/payment


@payments_bp.get("/orders/<order_id>/payment")
def get_payment_for_order(order_id: str) -> ResponseReturnValue:
    user = _require_customer()
    order_id_bytes = id_string_to_bytes(order_id)

    order = services().order_repository.select_order_by_id(order_id_bytes)
    if order is None or order.user_id != user.user_id:
        raise ApiError("Order not found", HTTPStatus.NOT_FOUND, code="ORDER_NOT_FOUND")

    payment = services().payment_repository.select_payment_by_order_id(order_id_bytes)
    if payment is None:
        raise ApiError(
            "No payment found for this order",
            HTTPStatus.NOT_FOUND,
            code="PAYMENT_NOT_FOUND",
        )
    return payment.to_dict(), HTTPStatus.OK


# GET /api/payments


@payments_bp.get("/payments")
def list_my_payments() -> ResponseReturnValue:
    user = _require_customer()
    payments = services().payment_repository.list_payments_by_user_id(user.user_id)
    return {"items": [p.to_dict() for p in payments]}, HTTPStatus.OK
