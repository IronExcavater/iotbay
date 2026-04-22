from dataclasses import dataclass

from src.products.models import Product
from src.products.repository import ProductRepository


@dataclass(slots=True, frozen=True)
class ProductService:
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
        return self.repository.insert_product(
            actor_user_id=actor_user_id,
            code=code,
            name=name,
            price_cents=price_cents,
        )

    def update_product(
        self,
        *,
        actor_user_id: bytes,
        code: str,
        name: str,
        price_cents: int,
        product_id: bytes,
    ) -> Product:
        return self.repository.update_product(
            actor_user_id=actor_user_id,
            code=code,
            name=name,
            price_cents=price_cents,
            product_id=product_id,
        )

    def delete_product(self, *, product_id: bytes) -> None:
        self.repository.delete_product(product_id=product_id)
