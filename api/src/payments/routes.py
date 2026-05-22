from http import HTTPStatus

from flask import Blueprint
from flask.typing import ResponseReturnValue
from src.auth.session import current_authenticated_user
from src.common.app import services
from src.common.sqlite_model import id_string_to_bytes
from src.common.web import ApiError, parse_request
from src.payments.requests import PayOrderRequest

payments_bp = Blueprint("payments", __name__)


def _require_customer() -> object:
    user = current_authenticated_user()
    if not user:
        raise ApiError("Authentication required", HTTPStatus.UNAUTHORIZED)
    if user.user_type != "customer":
        raise ApiError("Only customers can make payments", HTTPStatus.FORBIDDEN)
    return user


@payments_bp.post("/orders/<order_id>/pay")
def pay_order(order_id: str) -> ResponseReturnValue:
    """
    POST /api/orders/<order_id>/pay

    Accepts card details and processes a simulated payment for the order.
    The order must belong to the authenticated customer and be in 'saved' status.

    Request body:
        { "cardNumber": "4111111111111111",
          "cardHolder": "Jane Smith",
          "expiry": "12/28" }

    Responses:
        200  – payment succeeded; returns payment record
        402  – payment was declined by the simulated gateway
        404  – order not found or does not belong to this user
        409  – order already paid or in a non-payable state
    """
    user = _require_customer()
    order_id_bytes = id_string_to_bytes(order_id)
    req = parse_request(PayOrderRequest)

    payment_service = services().payment_service
    payment = payment_service.pay_order(
        actor_user_id=user.user_id,
        order_id=order_id_bytes,
        request=req,
    )
    return payment.to_dict(), HTTPStatus.OK


@payments_bp.get("/orders/<order_id>/payment")
def get_payment_for_order(order_id: str) -> ResponseReturnValue:
    """
    GET /api/orders/<order_id>/payment

    Returns the payment record for an order, if one exists.
    """
    user = _require_customer()
    order_id_bytes = id_string_to_bytes(order_id)

    # Verify order ownership first
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


@payments_bp.get("/payments")
def list_my_payments() -> ResponseReturnValue:
    """
    GET /api/payments

    Lists all payment records for the authenticated customer.
    """
    user = _require_customer()
    payments = services().payment_repository.list_payments_by_user_id(user.user_id)
    return {"items": [p.to_dict() for p in payments]}, HTTPStatus.OK
