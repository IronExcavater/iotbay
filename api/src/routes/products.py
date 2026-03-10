from http import HTTPStatus

from flask import Blueprint, current_app, request
from src.repositories.product_repository import DuplicateCodeError, ProductRepository

products_bp = Blueprint("products", __name__)


def _product_repository() -> ProductRepository:
    repository = current_app.extensions.get("product_repository")
    if not isinstance(repository, ProductRepository):
        raise RuntimeError("product_repository is not configured")
    return repository


def _error(message: str, status: HTTPStatus):
    return {"error": message}, status


@products_bp.get("/products")
def list_products():
    repository = _product_repository()
    products = [product.to_dict() for product in repository.list_products()]
    return {"items": products}, HTTPStatus.OK


@products_bp.post("/products")
def create_product():
    repository = _product_repository()
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error("request body must be a JSON object", HTTPStatus.BAD_REQUEST)

    name = payload.get("name")
    if not isinstance(name, str) or not name.strip():
        return _error("name is required", HTTPStatus.BAD_REQUEST)

    code = payload.get("code")
    if not isinstance(code, str) or not code.strip():
        return _error("code is required", HTTPStatus.BAD_REQUEST)

    price_cents = payload.get("priceCents")
    if isinstance(price_cents, bool) or not isinstance(price_cents, int):
        return _error("priceCents must be an integer", HTTPStatus.BAD_REQUEST)
    if price_cents < 0:
        return _error("priceCents must be >= 0", HTTPStatus.BAD_REQUEST)

    try:
        product = repository.create_product(
            name=name.strip(),
            code=code.strip().upper(),
            price_cents=price_cents,
        )
    except DuplicateCodeError as error:
        return _error(str(error), HTTPStatus.CONFLICT)

    return product.to_dict(), HTTPStatus.CREATED
