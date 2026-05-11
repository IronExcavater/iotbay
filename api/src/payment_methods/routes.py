from flask import Blueprint
from src.auth.session import current_authenticated_user
from src.common.app import services
from src.common.sqlite_model import id_string_to_bytes
from src.common.web import ApiError, parse_request
from src.payment_methods.requests import PaymentMethodRequest

payment_methods_bp = Blueprint("payment_methods", __name__)


def get_customer_user():
    user = current_authenticated_user()

    if not user:
        raise ApiError("Authentication required", 401)

    if user.user_type != "customer":
        raise ApiError("Only customers can manage payment methods", 403)

    return user


@payment_methods_bp.get("/payment-methods")
def list_payment_methods():
    user = get_customer_user()

    repo = services().payment_method_repository
    methods = repo.list_payment_methods(user.user_id)

    return methods


@payment_methods_bp.post("/payment-methods")
def create_payment_method():
    user = get_customer_user()
    req = parse_request(PaymentMethodRequest)

    card_number = req.card_number.replace(" ", "")
    card_last4 = card_number[-4:]

    repo = services().payment_method_repository

    method = repo.insert_payment_method(
        customer_id=user.user_id,
        type=req.type,
        cardholder_name=req.cardholder_name,
        card_last4=card_last4,
        expiry=req.expiry,
    )

    return method, 201


@payment_methods_bp.patch("/payment-methods/<payment_method_id>")
def update_payment_method(payment_method_id: str):
    user = get_customer_user()
    req = parse_request(PaymentMethodRequest)

    card_number = req.card_number.replace(" ", "")
    card_last4 = card_number[-4:]

    repo = services().payment_method_repository

    method = repo.update_payment_method(
        payment_method_id=id_string_to_bytes(payment_method_id),
        customer_id=user.user_id,
        type=req.type,
        cardholder_name=req.cardholder_name,
        card_last4=card_last4,
        expiry=req.expiry,
    )

    return method


@payment_methods_bp.delete("/payment-methods/<payment_method_id>")
def delete_payment_method(payment_method_id: str):
    user = get_customer_user()

    repo = services().payment_method_repository

    repo.delete_payment_method(
        id_string_to_bytes(payment_method_id),
        user.user_id,
    )

    return {}, 204
