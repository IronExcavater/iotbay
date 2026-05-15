import uuid
from http import HTTPStatus

from flask import Blueprint
from src.auth.session import (
    current_authenticated_staff_user,
    staff_permission_required,
)
from src.common.app import services
from src.common.web import ApiError, parse_query, parse_request
from src.products.requests import ProductListQuery, ProductMutationRequest
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


_PAGE_LIMIT = 24


@products_bp.get("/products")
def list_products():
    query = parse_query(ProductListQuery)
    items, total = services().products.list_products(
        search=query.q or None,
        type_filter=query.type or None,
        page=max(1, query.page),
        limit=_PAGE_LIMIT,
    )
    pages = max(1, -(-total // _PAGE_LIMIT))
    return {
        "items": [p.to_dict() for p in items],
        "total": total,
        "pages": pages,
    }, HTTPStatus.OK


@products_bp.get("/products/types")
def list_product_types():
    types = services().products.list_product_types()
    return {"types": types}, HTTPStatus.OK


@products_bp.get("/products/<product_id>")
def get_product(product_id: str):
    product = services().product_repository.select_product_by_id(
        product_id=_parse_product_id(product_id),
    )
    if product is None:
        raise ApiError("product was not found", HTTPStatus.NOT_FOUND)
    return product.to_dict(), HTTPStatus.OK


@products_bp.get("/admin/products/<product_id>")
@staff_permission_required(*PRODUCT_WRITE_PERMISSIONS)
def get_admin_product(product_id: str):
    product = services().product_repository.select_product_by_id(
        product_id=_parse_product_id(product_id),
    )
    if product is None:
        raise ApiError("product was not found", HTTPStatus.NOT_FOUND)
    return product.to_dict(), HTTPStatus.OK


@products_bp.post("/admin/products")
@staff_permission_required(*PRODUCT_WRITE_PERMISSIONS)
def create_product():
    data = parse_request(ProductMutationRequest)

    product = services().products.create_product(
        name=data.name,
        code=data.code,
        media_urls=data.media_urls,
        price_cents=data.price_cents,
        stock=data.stock,
        type=data.type,
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
        media_urls=data.media_urls,
        price_cents=data.price_cents,
        stock=data.stock,
        type=data.type,
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
