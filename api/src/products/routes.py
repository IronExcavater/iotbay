import uuid
from http import HTTPStatus

from flask import Blueprint
from src.auth.session import (
    current_authenticated_staff_user,
    staff_permission_required,
)
from src.common.app import services
from src.common.web import ApiError, parse_request
from src.products.requests import ProductMutationRequest
from src.users.models import STAFF_PERMISSION_ADMIN, STAFF_PERMISSION_SUPERADMIN

products_bp = Blueprint("products", __name__)
PRODUCT_WRITE_PERMISSIONS = (
    STAFF_PERMISSION_ADMIN,
    STAFF_PERMISSION_SUPERADMIN,
)


class InvalidProductIdError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "product id is invalid",
            HTTPStatus.BAD_REQUEST,
            code="PRODUCT_ID_INVALID",
        )


@products_bp.get("/products")
def list_products():
    products = [product.to_dict() for product in services().products.list_products()]
    return {"items": products}, HTTPStatus.OK


@products_bp.post("/admin/products")
@staff_permission_required(*PRODUCT_WRITE_PERMISSIONS)
def create_product():
    data = parse_request(ProductMutationRequest)

    product = services().products.create_product(
        name=data.name,
        code=data.code,
        price_cents=data.price_cents,
        actor_user_id=current_authenticated_staff_user(
            *PRODUCT_WRITE_PERMISSIONS
        ).user_id,
    )

    return product.to_dict(), HTTPStatus.CREATED


@products_bp.patch("/admin/products/<product_id>")
@staff_permission_required(*PRODUCT_WRITE_PERMISSIONS)
def update_product(product_id: str):
    data = parse_request(ProductMutationRequest)

    product = services().products.update_product(
        product_id=_parse_product_id(product_id),
        name=data.name,
        code=data.code,
        price_cents=data.price_cents,
        actor_user_id=current_authenticated_staff_user(
            *PRODUCT_WRITE_PERMISSIONS
        ).user_id,
    )
    return product.to_dict(), HTTPStatus.OK


@products_bp.delete("/admin/products/<product_id>")
@staff_permission_required(*PRODUCT_WRITE_PERMISSIONS)
def delete_product(product_id: str):
    services().products.delete_product(product_id=_parse_product_id(product_id))
    return "", HTTPStatus.NO_CONTENT


def _parse_product_id(value: str) -> bytes:
    try:
        return uuid.UUID(value).bytes
    except ValueError as error:
        raise InvalidProductIdError() from error
