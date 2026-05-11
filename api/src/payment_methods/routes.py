from flask import Blueprint
from src.auth.session import current_authenticated_user
from src.common.app import services
from src.common.sqlite_model import id_string_to_bytes
from src.common.web import ApiError, parse_request
from src.payment_methods.requests import (
    CreatePaymentMethodRequest,
)

payment_methods_bp = Blueprint(
    "payment_methods",
    __name__,
)


@payment_methods_bp.get("/payment-methods")
def list_payment_methods():
    user = current_authenticated_user()

    if not user:
        raise ApiError("Authentication required", 401)

    repo = services().payment_method_repository

    methods = repo.list_payment_methods(user.user_id)

    return methods


@payment_methods_bp.post("/payment-methods")
def create_payment_method():
    user = current_authenticated_user()

    if not user:
        raise ApiError("Authentication required", 401)

    req = parse_request(CreatePaymentMethodRequest)

    repo = services().payment_method_repository

    method = repo.insert_payment_method(
        customer_id=user.user_id,
        type=req.type,
        cardholder_name=req.cardholder_name,
        card_last4=req.card_number[-4:],
        expiry=req.expiry,
    )

    return method, 201


@payment_methods_bp.delete("/payment-methods/<payment_method_id>")
def delete_payment_method(payment_method_id: str):
    user = current_authenticated_user()

    if not user:
        raise ApiError("Authentication required", 401)

    repo = services().payment_method_repository

    repo.delete_payment_method(id_string_to_bytes(payment_method_id))

    return {}, 204
