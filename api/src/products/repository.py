import sqlite3

from src.common.clock import UtcTime
from src.common.repository import Repository
from src.common.web import ApiError
from src.products.models import Product


class DuplicateCodeError(ApiError):
    def __init__(self) -> None:
        super().__init__("code already exists", 409)


class ProductRepository(Repository):
    def list_products(self) -> list[Product]:
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT *
                FROM products
                ORDER BY created_at ASC, code ASC
                """
            ).fetchall()

        return [Product.from_row(row) for row in rows]

    def create_product(self, name: str, code: str, price_cents: int) -> Product:
        product = Product(
            name=name,
            code=code,
            price_cents=price_cents,
            created_at=UtcTime.now().iso,
        )

        try:
            with self.connect() as connection:
                self.insert_into(
                    connection,
                    "products",
                    {
                        "product_id": product.product_id,
                        "name": product.name,
                        "code": product.code,
                        "price_cents": product.price_cents,
                        "created_at": product.created_at,
                    },
                )
        except sqlite3.IntegrityError as error:
            raise DuplicateCodeError() from error

        return product
