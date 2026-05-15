from dataclasses import dataclass, replace
from typing import Any

from src.audit.models import AUDIT_ACTION_CREATED, ENTITY_TYPE_ORDER
from src.audit.service import AuditService
from src.common.clock import UtcTime
from src.common.sqlite_model import id_string_to_bytes, new_id_bytes
from src.common.web import ApiError
from src.orders.models import (
    ORDER_STATUS_CANCELLED,
    ORDER_STATUS_PAID,
    ORDER_STATUS_SAVED,
    Order,
    OrderItem,
)
from src.orders.queries import (
    INSERT_ORDER,
    INSERT_ORDER_ITEM,
    SELECT_ORDER_BY_ID,
    SELECT_ORDER_ITEMS,
    UPDATE_ORDER_STATUS,
)
from src.orders.repository import OrderRepository
from src.products.repository import ProductRepository

VALID_TRANSITIONS: dict[str, set[str]] = {
    ORDER_STATUS_SAVED: {ORDER_STATUS_PAID, ORDER_STATUS_CANCELLED},
    ORDER_STATUS_PAID: set(),
    ORDER_STATUS_CANCELLED: set(),
}


@dataclass(slots=True, frozen=True)
class OrderService:
    audit: AuditService
    order_repository: OrderRepository
    product_repository: ProductRepository

    def create_order(
        self,
        *,
        actor_user_id: bytes,
        address_id: bytes | None,
        items: list[dict[str, Any]],
    ) -> Order:
        if not items:
            raise ApiError("At least one item is required", 400)

        total_cents = 0
        order_items: list[tuple[bytes, int, int]] = []

        for item in items:
            product_id_str = str(item["product_id"])
            quantity = int(item["quantity"])
            if quantity < 1:
                raise ApiError("Quantity must be at least 1", 400)

            product_id_bytes = id_string_to_bytes(product_id_str)
            product = self.product_repository.select_product_by_id(
                product_id=product_id_bytes
            )
            if product is None:
                raise ApiError(
                    f"Product {product_id_str} not found",
                    404,
                    code="PRODUCT_NOT_FOUND",
                )

            if product.stock < quantity:
                raise ApiError(
                    f"Insufficient stock for '{product.name}'. "
                    f"Available: {product.stock}, requested: {quantity}",
                    409,
                    code="INSUFFICIENT_STOCK",
                )

            total_cents += product.price_cents * quantity
            order_items.append((product_id_bytes, quantity, product.price_cents))

        order = self._insert_order_and_stock(
            user_id=actor_user_id,
            address_id=address_id,
            items=order_items,
            total_cents=total_cents,
        )

        self._record_audit(
            action=AUDIT_ACTION_CREATED,
            actor_user_id=actor_user_id,
            order=order,
            after={"status": order.status, "totalCents": order.total_cents},
        )

        return order

    def _insert_order_and_stock(
        self,
        *,
        user_id: bytes,
        address_id: bytes | None,
        items: list[tuple[bytes, int, int]],
        total_cents: int,
    ) -> Order:
        now = UtcTime.now().iso
        order_id_bytes = new_id_bytes()

        with self.order_repository.connect() as connection:
            for product_id, quantity, _ in items:
                success = self.product_repository.decrease_stock(
                    connection,
                    product_id=product_id,
                    quantity=quantity,
                )
                if not success:
                    raise ApiError(
                        "Insufficient stock — another order may have claimed it",
                        409,
                        code="INSUFFICIENT_STOCK",
                    )

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
            for product_id, quantity, price_cents in items:
                connection.execute(
                    INSERT_ORDER_ITEM,
                    (order_id_bytes, product_id, quantity, price_cents),
                )

            row = connection.execute(SELECT_ORDER_BY_ID, (order_id_bytes,)).fetchone()
            order = Order(**row)
            item_rows = connection.execute(
                SELECT_ORDER_ITEMS, (order_id_bytes,)
            ).fetchall()
            return replace(order, items=[OrderItem(**r) for r in item_rows])

    def update_status(
        self,
        *,
        actor_user_id: bytes,
        order_id: bytes,
        new_status: str,
    ) -> Order:
        order = self.order_repository.select_order_by_id(order_id)
        if order is None:
            raise ApiError("Order not found", 404)

        allowed = VALID_TRANSITIONS.get(order.status, set())
        if new_status not in allowed:
            raise ApiError(
                f"Cannot transition from '{order.status}' to '{new_status}'",
                400,
                code="INVALID_STATUS_TRANSITION",
            )

        before_status = order.status
        now = UtcTime.now().iso

        with self.order_repository.connect() as connection:
            if new_status == ORDER_STATUS_CANCELLED:
                for item in order.items:
                    self.product_repository.increase_stock(
                        connection,
                        product_id=item.product_id,
                        quantity=item.quantity,
                    )

            connection.execute(UPDATE_ORDER_STATUS, (new_status, now, order_id))
            row = connection.execute(SELECT_ORDER_BY_ID, (order_id,)).fetchone()
            updated_order = replace(
                Order(**row),
                items=[
                    OrderItem(**r)
                    for r in connection.execute(
                        SELECT_ORDER_ITEMS, (order_id,)
                    ).fetchall()
                ],
            )

        self._record_audit(
            action="status_changed",
            actor_user_id=actor_user_id,
            order=updated_order,
            before={"status": before_status},
            after={"status": new_status},
        )

        return updated_order

    def _record_audit(
        self,
        *,
        action: str,
        actor_user_id: bytes,
        order: Order,
        after: dict[str, object] | None = None,
        before: dict[str, object] | None = None,
    ) -> None:
        with self.order_repository.connect() as connection:
            self.audit.record_event(
                connection,
                action=action,
                actor_user_id=actor_user_id,
                after=after,
                before=before,
                entity_id=order.order_id,
                entity_type=ENTITY_TYPE_ORDER,
                occurred_at=UtcTime.now().iso,
            )
