import sqlite3

from src.common.clock import UtcTime
from src.common.web import ApiError
from src.models import Product


class DuplicateCodeError(ApiError):
    def __init__(self) -> None:
        super().__init__("code already exists", 409)


class ProductRepository:
    def __init__(self, database_path: str) -> None:
        self._database_path = database_path

    def list_products(self) -> list[Product]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT id, name, code, price_cents, created_at
                FROM products
                ORDER BY id ASC
                """
            ).fetchall()

        return [
            Product(
                id=product_id,
                name=name,
                code=code,
                price_cents=price_cents,
                created_at=created_at,
            )
            for product_id, name, code, price_cents, created_at in rows
        ]

    def create_product(self, name: str, code: str, price_cents: int) -> Product:
        created_at = UtcTime.now().iso

        try:
            with self._connect() as connection:
                cursor = connection.execute(
                    """
                    INSERT INTO products (name, code, price_cents, created_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (name, code, price_cents, created_at),
                )
        except sqlite3.IntegrityError as error:
            raise DuplicateCodeError() from error

        product_id = cursor.lastrowid
        if product_id is None:
            raise RuntimeError("failed to load inserted product")

        return Product(
            id=product_id,
            name=name,
            code=code,
            price_cents=price_cents,
            created_at=created_at,
        )

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self._database_path)
