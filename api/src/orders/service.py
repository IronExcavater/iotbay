from dataclasses import dataclass
from typing import Any

from src.audit.models import AUDIT_ACTION_CREATED, ENTITY_TYPE_ORDER
from src.audit.service import AuditService
from src.common.clock import UtcTime
from src.common.sqlite_model import id_string_to_bytes
from src.common.web import ApiError
from src.orders.models import (
    ORDER_STATUS_CANCELLED,
    ORDER_STATUS_PAID,
    ORDER_STATUS_SAVED,
    Order,
)
from src.orders.repository import OrderRepository
from src.products.repository import ProductRepository

# Valid status transitions: current_status -> set of allowed next statuses
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
        """
        Create an order from a list of items.
        Each item dict must have 'product_id' (str) and 'quantity' (int).
        Fetches real product prices from the database.
        """
        if not items:
            raise ApiError("At least one item is required", 400)

        total_cents = 0
        order_items: list[tuple[bytes, int]] = []

        for item in items:
            product_id_str = str(item["product_id"])
            quantity = int(item["quantity"])

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

            total_cents += product.price_cents * quantity
            order_items.append((product_id_bytes, quantity))

        order = self.order_repository.insert_order(
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

    def update_status(
        self,
        *,
        actor_user_id: bytes,
        order_id: bytes,
        new_status: str,
    ) -> Order:
        """Transition an order to a new status following valid transitions."""
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
        updated_order = self.order_repository.update_order_status(
            order_id=order_id,
            new_status=new_status,
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
