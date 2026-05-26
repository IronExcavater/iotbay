import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone


class DuplicateCodeError(Exception):
    pass


@dataclass(slots=True)
class Product:
    id: int
    name: str
    code: str
    price_cents: int
    created_at: str

    def to_dict(self) -> dict[str, int | str]:
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "priceCents": self.price_cents,
            "createdAt": self.created_at,
        }


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
        created_at = datetime.now(tz=timezone.utc).isoformat()

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
            raise DuplicateCodeError("code already exists") from error

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
