from dataclasses import replace

from src.common.clock import UtcTime
from src.common.repository import Repository
from src.common.web import ApiError
from src.orders.models import Order, OrderItem
from src.orders.queries import (
    LIST_ORDERS_BY_USER,
    SEARCH_ORDERS_BY_USER,
    SELECT_ORDER_BY_ID,
    SELECT_ORDER_ITEMS,
    UPDATE_ORDER_ADDRESS,
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

    def list_all_orders(
        self,
        *,
        order_id: str | None = None,
        date: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[Order], int]:
        conditions = ["1=1"]
        params: list = []
        if order_id is not None:
            conditions.append("LOWER(HEX(order_id)) LIKE ?")
            params.append(f"%{order_id.strip().lower().replace('-', '')}%")
        if date:
            conditions.append("DATE(created_at) = ?")
            params.append(date)
        where = " AND ".join(conditions)
        base = (
            "SELECT order_id, user_id, address_id, status,"
            " total_cents, created_at, updated_at"
            f" FROM orders WHERE {where} ORDER BY created_at DESC"
        )
        offset = (page - 1) * limit
        with self.connect() as connection:
            total = connection.execute(
                f"SELECT COUNT(*) FROM ({base})", params
            ).fetchone()[0]
            rows = connection.execute(
                f"{base} LIMIT ? OFFSET ?", params + [limit, offset]
            ).fetchall()
            orders = []
            for row in rows:
                order = Order(**row)
                orders.append(
                    replace(
                        order,
                        items=self._select_order_items(connection, order.order_id),
                    )
                )
        return orders, total

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

    def update_order_status(self, *, order_id: bytes, new_status: str) -> Order:
        now = UtcTime.now().iso
        with self.connect() as connection:
            connection.execute(UPDATE_ORDER_STATUS, (new_status, now, order_id))
            row = connection.execute(SELECT_ORDER_BY_ID, (order_id,)).fetchone()
            if not row:
                raise ApiError("Order not found", 404)
            order = Order(**row)
            return replace(order, items=self._select_order_items(connection, order_id))

    def update_order_address(
        self,
        *,
        order_id: bytes,
        address_line_one: str | None,
        suburb: str | None,
        state: str | None,
        postcode: str | None,
        country: str | None,
    ) -> Order:
        now = UtcTime.now().iso
        with self.connect() as connection:
            connection.execute(
                UPDATE_ORDER_ADDRESS,
                (
                    address_line_one,
                    suburb,
                    state,
                    postcode,
                    country,
                    now,
                    order_id,
                ),
            )
            row = connection.execute(SELECT_ORDER_BY_ID, (order_id,)).fetchone()
            if not row:
                raise ApiError("Order not found", 404)
            order = Order(**row)
            return replace(order, items=self._select_order_items(connection, order_id))
