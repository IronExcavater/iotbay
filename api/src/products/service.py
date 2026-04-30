from dataclasses import dataclass

from src.audit.models import (
    AUDIT_ACTION_CREATED,
    AUDIT_ACTION_UPDATED,
    ENTITY_TYPE_PRODUCT,
)
from src.audit.service import AuditService
from src.common.clock import UtcTime
from src.products.models import Product
from src.products.repository import ProductRepository


@dataclass(slots=True, frozen=True)
class ProductService:
    audit: AuditService
    repository: ProductRepository

    def list_products(self) -> list[Product]:
        return self.repository.list_products()

    def create_product(
        self,
        *,
        actor_user_id: bytes,
        code: str,
        name: str,
        price_cents: int,
    ) -> Product:
        product = self.repository.insert_product(
            actor_user_id=actor_user_id,
            code=code,
            name=name,
            price_cents=price_cents,
        )
        self._record_product_audit(
            action=AUDIT_ACTION_CREATED,
            actor_user_id=actor_user_id,
            after=product.snapshot(),
            product=product,
        )
        return product

    def update_product(
        self,
        *,
        actor_user_id: bytes,
        code: str,
        name: str,
        price_cents: int,
        product_id: bytes,
    ) -> Product:
        before = self.repository.select_product_by_id(product_id=product_id)
        product = self.repository.update_product(
            actor_user_id=actor_user_id,
            code=code,
            name=name,
            price_cents=price_cents,
            product_id=product_id,
        )
        self._record_product_audit(
            action=AUDIT_ACTION_UPDATED,
            actor_user_id=actor_user_id,
            after=product.snapshot(),
            before=before.snapshot() if before is not None else None,
            product=product,
        )
        return product

    def delete_product(self, *, product_id: bytes) -> None:
        self.repository.delete_product(product_id=product_id)

    def apply_product_snapshot(
        self,
        *,
        actor_user_id: bytes,
        product_id: bytes,
        snapshot: dict[str, object],
    ) -> Product:
        before = self.repository.select_product_by_id(product_id=product_id)
        product = self.repository.apply_product_snapshot(
            actor_user_id=actor_user_id,
            product_id=product_id,
            snapshot=snapshot,
        )
        self._record_product_audit(
            action=AUDIT_ACTION_UPDATED,
            actor_user_id=actor_user_id,
            after=product.snapshot(),
            before=before.snapshot() if before is not None else None,
            product=product,
        )
        return product

    def _record_product_audit(
        self,
        *,
        action: str,
        actor_user_id: bytes,
        product: Product,
        after: dict[str, object] | None,
        before: dict[str, object] | None = None,
    ) -> None:
        with self.repository.connect() as connection:
            self.audit.record_event(
                connection,
                action=action,
                actor_user_id=actor_user_id,
                after=after,
                before=before,
                entity_id=product.product_id,
                entity_type=ENTITY_TYPE_PRODUCT,
                occurred_at=UtcTime.now().iso,
            )
