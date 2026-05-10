from flask import Blueprint
from flask import request as flask_request
from src.auth.session import (
    current_authenticated_staff_user,
    current_authenticated_user,
)
from src.common.app import services
from src.common.sqlite_model import id_string_to_bytes
from src.common.web import ApiError, parse_request
from src.orders.requests import CreateOrderRequest, UpdateOrderStatusRequest

orders_bp = Blueprint("orders", __name__)


@orders_bp.get("/orders")
def list_orders():
    user = current_authenticated_user()
    if not user:
        raise ApiError("Authentication required", 401)

    repo = services().order_repository
    order_id_param = flask_request.args.get("orderId")
    date_param = flask_request.args.get("date")

    if order_id_param or date_param:
        try:
            order_id_bytes = (
                id_string_to_bytes(order_id_param) if order_id_param else None
            )
        except ValueError:
            raise ApiError("Invalid order ID format", 400, code="INVALID_ID")
        orders = repo.search_orders_by_user(
            user_id=user.user_id,
            order_id=order_id_bytes,
            date=date_param,
        )
    else:
        orders = repo.list_orders_by_user_id(user.user_id)

    return [order.to_dict() for order in orders]


@orders_bp.post("/orders")
def create_order():
    user = current_authenticated_user()
    if not user:
        raise ApiError("Authentication required", 401)

    if user.user_type != "customer":
        raise ApiError("Only customers can place orders", 403)

    req = parse_request(CreateOrderRequest)
    address_id_bytes = id_string_to_bytes(req.address_id) if req.address_id else None

    order_service = services().orders
    order = order_service.create_order(
        actor_user_id=user.user_id,
        address_id=address_id_bytes,
        items=[
            {"product_id": item.product_id, "quantity": item.quantity}
            for item in req.items
        ],
    )
    return order.to_dict(), 201


@orders_bp.get("/staff/all")
def list_all_orders():
    current_authenticated_staff_user()

    repo = services().order_repository
    orders = repo.list_all_orders()
    return [order.to_dict() for order in orders]


@orders_bp.get("/orders/<order_id>")
def get_order(order_id: str):
    user = current_authenticated_user()
    if not user:
        raise ApiError("Authentication required", 401)

    order_id_bytes = id_string_to_bytes(order_id)
    repo = services().order_repository
    order = repo.select_order_by_id(order_id_bytes)
    if not order or order.user_id != user.user_id:
        raise ApiError("Order not found", 404)
    return order.to_dict()


@orders_bp.patch("/orders/<order_id>/status")
def update_order_status(order_id: str):
    user = current_authenticated_user()
    if not user:
        raise ApiError("Authentication required", 401)

    order_id_bytes = id_string_to_bytes(order_id)

    # Verify the order belongs to this user
    repo = services().order_repository
    existing = repo.select_order_by_id(order_id_bytes)
    if not existing or existing.user_id != user.user_id:
        raise ApiError("Order not found", 404)

    req = parse_request(UpdateOrderStatusRequest)
    order_service = services().orders
    order = order_service.update_status(
        actor_user_id=user.user_id,
        order_id=order_id_bytes,
        new_status=req.status,
    )
    return order.to_dict()
