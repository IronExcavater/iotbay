from dataclasses import dataclass


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
