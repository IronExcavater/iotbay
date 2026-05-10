from flask import Blueprint
from src.auth.session import current_authenticated_user
from src.cart.requests import AddCartItemRequest
from src.common.app import services
from src.common.sqlite_model import id_string_to_bytes
from src.common.web import ApiError, parse_request

cart_bp = Blueprint("cart", __name__)


def _require_customer():
    user = current_authenticated_user()
    if not user:
        raise ApiError("Authentication required", 401)
    if user.user_type != "customer":
        raise ApiError("Only customers have a cart", 403)
    return user


@cart_bp.get("/cart")
def get_cart():
    user = _require_customer()
    cart = services().cart_repository.get_or_create_cart(user.user_id)
    return cart.to_dict()


@cart_bp.post("/cart/items")
def add_cart_item():
    user = _require_customer()
    req = parse_request(AddCartItemRequest)
    product_id = id_string_to_bytes(req.product_id)
    cart = services().cart_repository.add_or_update_item(
        user_id=user.user_id,
        product_id=product_id,
        quantity=req.quantity,
    )
    return cart.to_dict(), 201


@cart_bp.delete("/cart/items/<product_id>")
def remove_cart_item(product_id: str):
    user = _require_customer()
    product_id_bytes = id_string_to_bytes(product_id)
    cart = services().cart_repository.remove_item(
        user_id=user.user_id,
        product_id=product_id_bytes,
    )
    return cart.to_dict()


@cart_bp.delete("/cart/items")
def clear_cart():
    user = _require_customer()
    cart = services().cart_repository.clear_items(user_id=user.user_id)
    return cart.to_dict()
