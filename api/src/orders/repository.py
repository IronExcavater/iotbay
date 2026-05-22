from dataclasses import replace

from src.common.clock import UtcTime
from src.common.repository import Repository
from src.common.sqlite_model import new_id_bytes
from src.common.web import ApiError
from src.orders.models import ORDER_STATUS_SAVED, Order, OrderItem
from src.orders.queries import (
    INSERT_ORDER,
    INSERT_ORDER_ITEM,
    LIST_ALL_ORDERS,
    LIST_ORDERS_BY_USER,
    SEARCH_ORDERS_BY_USER,
    SELECT_ORDER_BY_ID,
    SELECT_ORDER_ITEMS,
    UPDATE_ORDER_STATUS,
)


class OrderRepository(Repository):
    def __init__(self, database_path: str) -> None:
        super().__init__(database_path)

    def select_order_by_id(self, order_id: bytes) -> Order | None:
        with self.connect() as connection:
            row = connection.execute(SELECT_ORDER_BY_ID, (order_id,)).fetchone()
            if not row:
                return None
            order = Order(**row)
            return replace(order, items=self._select_order_items(connection, order_id))

    def list_orders_by_user_id(self, user_id: bytes) -> list[Order]:
        with self.connect() as connection:
            rows = connection.execute(LIST_ORDERS_BY_USER, (user_id,)).fetchall()
            orders = []
            for row in rows:
                order = Order(**row)
                orders.append(
                    replace(
                        order,
                        items=self._select_order_items(connection, order.order_id),
                    )
                )
            return orders

    def list_all_orders(self) -> list[Order]:
        with self.connect() as connection:
            rows = connection.execute(LIST_ALL_ORDERS).fetchall()
            orders = []
            for row in rows:
                order = Order(**row)
                items = self._select_order_items(connection, order.order_id)
                orders.append(replace(order, items=items))
            return orders

    def search_orders_by_user(
        self,
        *,
        user_id: bytes,
        order_id: bytes | None = None,
        date: str | None = None,
    ) -> list[Order]:
        with self.connect() as connection:
            rows = connection.execute(
                SEARCH_ORDERS_BY_USER,
                (user_id, order_id, order_id, date, date),
            ).fetchall()
            orders = []
            for row in rows:
                order = Order(**row)
                items = self._select_order_items(connection, order.order_id)
                orders.append(replace(order, items=items))
            return orders

    def _select_order_items(
        self,
        connection,
        order_id: bytes,
    ) -> list[OrderItem]:
        rows = connection.execute(SELECT_ORDER_ITEMS, (order_id,)).fetchall()
        return [OrderItem(**row) for row in rows]

    def insert_order(
        self,
        user_id: bytes,
        address_id: bytes | None,
        items: list[tuple[bytes, int]],
        total_cents: int,
    ) -> Order:
        now = UtcTime.now().iso

        order_id_bytes = new_id_bytes()
        with self.connect() as connection:
            connection.execute(
                INSERT_ORDER,
                (
                    order_id_bytes,
                    user_id,
                    address_id,
                    ORDER_STATUS_SAVED,
                    total_cents,
                    now,
                    now,
                ),
            )
            for product_id, quantity in items:
                connection.execute(
                    INSERT_ORDER_ITEM, (order_id_bytes, product_id, quantity)
                )
            order = Order(
                order_id=order_id_bytes,
                user_id=user_id,
                address_id=address_id,
                status=ORDER_STATUS_SAVED,
                total_cents=total_cents,
                created_at=now,
                updated_at=now,
            )
            return replace(
                order, items=self._select_order_items(connection, order_id_bytes)
            )

    def update_order_status(self, *, order_id: bytes, new_status: str) -> Order:
        now = UtcTime.now().iso
        with self.connect() as connection:
            connection.execute(UPDATE_ORDER_STATUS, (new_status, now, order_id))
            row = connection.execute(SELECT_ORDER_BY_ID, (order_id,)).fetchone()
            if not row:
                raise ApiError("Order not found", 404)
            order = Order(**row)
            return replace(order, items=self._select_order_items(connection, order_id))
