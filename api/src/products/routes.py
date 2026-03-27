from http import HTTPStatus

from flask import Blueprint, current_app
from src.common.web import RequestData, ValidationError
from src.products.repository import ProductRepository

products_bp = Blueprint("products", __name__)


def _product_repository() -> ProductRepository:
    repository = current_app.extensions.get("product_repository")
    if not isinstance(repository, ProductRepository):
        raise RuntimeError("product_repository is not configured")
    return repository


@products_bp.get("/products")
def list_products():
    repository = _product_repository()

    products = [product.to_dict() for product in repository.list_products()]
    return {"items": products}, HTTPStatus.OK


@products_bp.post("/products")
def create_product():
    repository = _product_repository()

    data = RequestData.from_request()
    price_cents = data.integer("priceCents", message="priceCents must be an integer")
    if price_cents < 0:
        raise ValidationError("priceCents must be >= 0")

    product = repository.create_product(
        name=data.string("name", message="name is required"),
        code=data.string("code", message="code is required").upper(),
        price_cents=price_cents,
    )

    return product.to_dict(), HTTPStatus.CREATED
