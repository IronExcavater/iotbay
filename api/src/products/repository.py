import sqlite3

from src.audit.repository import AuditRepository
from src.common.clock import UtcTime
from src.common.repository import Repository
from src.common.web import ApiError
from src.products.models import ENTITY_TYPE_PRODUCT, Product
from src.products.queries import LIST_PRODUCTS, SEARCH_PRODUCTS, SELECT_PRODUCT_BY_ID


class DuplicateCodeError(ApiError):
    def __init__(self) -> None:
        super().__init__("code already exists", 409, code="PRODUCT_CODE_EXISTS")


class ProductNotFoundError(ApiError):
    def __init__(self) -> None:
        super().__init__("product was not found", 404, code="PRODUCT_NOT_FOUND")


class ProductRepository(Repository):
    def __init__(self, database_path: str) -> None:
        super().__init__(database_path)
        self._audit = AuditRepository(database_path)

    def list_products(self, *, search: str | None = None) -> list[Product]:
        normalized_search = (search or "").strip().lower()
        with self.connect() as connection:
            if normalized_search:
                like_query = f"%{normalized_search}%"
                rows = connection.execute(
                    SEARCH_PRODUCTS,
                    (ENTITY_TYPE_PRODUCT, like_query, like_query),
                ).fetchall()
            else:
                rows = connection.execute(
                    LIST_PRODUCTS,
                    (ENTITY_TYPE_PRODUCT,),
                ).fetchall()

        return [Product.from_row(row) for row in rows]

    def select_product_by_id(self, *, product_id: bytes) -> Product | None:
        with self.connect() as connection:
            row = connection.execute(
                SELECT_PRODUCT_BY_ID,
                (ENTITY_TYPE_PRODUCT, product_id),
            ).fetchone()

        if row is None:
            return None

        return Product.from_row(row)

    def insert_product(
        self,
        *,
        name: str,
        code: str,
        media_urls: list[str],
        price_cents: int,
        actor_user_id: bytes,
        stock: int,
        type: str,
    ) -> Product:
        now_iso = UtcTime.now().iso
        product = Product.create(
            name=name,
            code=code,
            media_urls=media_urls,
            price_cents=price_cents,
            stock=stock,
            type=type,
            now_iso=now_iso,
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
                        "description": product.description,
                        "media_urls_json": product.media_urls_json,
                        "price_cents": product.price_cents,
                        "stock": product.stock,
                        "type": product.type,
                    },
                )
                self._audit.insert_entity(
                    connection,
                    entity_type=ENTITY_TYPE_PRODUCT,
                    entity_id=product.product_id,
                    created_at=product.created_at,
                    updated_at=product.updated_at,
                    created_by_user_id=actor_user_id,
                    updated_by_user_id=actor_user_id,
                )
        except sqlite3.IntegrityError as error:
            raise DuplicateCodeError() from error

        return product

    def update_product(
        self,
        *,
        product_id: bytes,
        name: str,
        code: str,
        media_urls: list[str],
        price_cents: int,
        actor_user_id: bytes,
        stock: int,
        type: str,
    ) -> Product:
        existing_product = self.select_product_by_id(product_id=product_id)
        if existing_product is None:
            raise ProductNotFoundError()

        updated_product = existing_product.updated(
            name=name,
            code=code,
            media_urls=media_urls,
            price_cents=price_cents,
            stock=stock,
            type=type,
            updated_at=UtcTime.now().iso,
        )

        try:
            with self.connect() as connection:
                self.update_where(
                    connection,
                    "products",
                    {
                        "name": updated_product.name,
                        "code": updated_product.code,
                        "description": updated_product.description,
                        "media_urls_json": updated_product.media_urls_json,
                        "price_cents": updated_product.price_cents,
                        "stock": updated_product.stock,
                        "type": updated_product.type,
                    },
                    where="product_id = ?",
                    where_parameters=(updated_product.product_id,),
                )
                self._audit.update_entity(
                    connection,
                    entity_type=ENTITY_TYPE_PRODUCT,
                    entity_id=updated_product.product_id,
                    updated_at=updated_product.updated_at,
                    updated_by_user_id=actor_user_id,
                )
        except sqlite3.IntegrityError as error:
            raise DuplicateCodeError() from error

        return updated_product

    def apply_product_snapshot(
        self,
        *,
        actor_user_id: bytes,
        product_id: bytes,
        snapshot: dict[str, object],
    ) -> Product:
        existing_product = self.select_product_by_id(product_id=product_id)
        if existing_product is None:
            raise ProductNotFoundError()

        price_value = snapshot.get("priceCents")
        price_cents = (
            price_value
            if isinstance(price_value, int)
            else existing_product.price_cents
        )
        media_urls_value = snapshot.get("mediaUrls")
        media_urls = (
            [item for item in media_urls_value if isinstance(item, str)]
            if isinstance(media_urls_value, list)
            else existing_product.media_urls
        )
        stock_value = snapshot.get("stock")
        stock = stock_value if isinstance(stock_value, int) else existing_product.stock
        return self.update_product(
            actor_user_id=actor_user_id,
            code=str(snapshot.get("code") or existing_product.code),
            media_urls=media_urls,
            name=str(snapshot.get("name") or existing_product.name),
            price_cents=price_cents,
            product_id=product_id,
            stock=stock,
            type=str(snapshot.get("type") or existing_product.type),
        )

    def delete_product(self, *, product_id: bytes) -> None:
        with self.connect() as connection:
            deleted_count = self.delete_from(
                connection,
                "products",
                where="product_id = ?",
                where_parameters=(product_id,),
            )
            self._audit.delete_entity(
                connection,
                entity_type=ENTITY_TYPE_PRODUCT,
                entity_id=product_id,
            )

        if deleted_count == 0:
            raise ProductNotFoundError()

    def decrease_stock(
        self,
        connection: sqlite3.Connection,
        *,
        product_id: bytes,
        quantity: int,
    ) -> bool:
        cursor = connection.execute(
            "UPDATE products SET stock = stock - ? WHERE product_id = ? AND stock >= ?",
            (quantity, product_id, quantity),
        )
        return cursor.rowcount > 0

    def increase_stock(
        self,
        connection: sqlite3.Connection,
        *,
        product_id: bytes,
        quantity: int,
    ) -> None:
        connection.execute(
            "UPDATE products SET stock = stock + ? WHERE product_id = ?",
            (quantity, product_id),
        )
