from dataclasses import dataclass

from src.audit.models import (
    AUDIT_ACTION_CREATED,
    AUDIT_ACTION_UPDATED,
    ENTITY_TYPE_PRODUCT,
)
from src.audit.service import AuditService
from src.common.clock import UtcTime
from src.common.web import ApiError
from src.media.repository import (
    InvalidMediaDataError,
    MediaRepository,
    is_data_image_url,
)
from src.products.models import Product
from src.products.repository import ProductRepository


@dataclass(slots=True, frozen=True)
class ProductService:
    audit: AuditService
    media_repository: MediaRepository
    repository: ProductRepository

    def list_products(self) -> list[Product]:
        return self.repository.list_products()

    def create_product(
        self,
        *,
        actor_user_id: bytes,
        code: str,
        media_urls: list[str],
        name: str,
        price_cents: int,
    ) -> Product:
        stored_media_urls = self._stored_media_urls(media_urls)
        product = self.repository.insert_product(
            actor_user_id=actor_user_id,
            code=code,
            media_urls=stored_media_urls,
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
        media_urls: list[str],
        name: str,
        price_cents: int,
        product_id: bytes,
    ) -> Product:
        before = self.repository.select_product_by_id(product_id=product_id)
        stored_media_urls = self._stored_media_urls(media_urls)
        product = self.repository.update_product(
            actor_user_id=actor_user_id,
            code=code,
            media_urls=stored_media_urls,
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

    def _stored_media_urls(self, values: list[str]) -> list[str]:
        stored_values: list[str] = []
        with self.repository.connect() as connection:
            for value in values:
                if not is_data_image_url(value):
                    stored_values.append(value)
                    continue
                try:
                    stored_values.append(
                        self.media_repository.store_data_url(
                            connection,
                            data_url=value,
                        )
                    )
                except InvalidMediaDataError as error:
                    raise ApiError(str(error), 400, code="MEDIA_INVALID") from error
        return stored_values

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
