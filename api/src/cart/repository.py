from dataclasses import replace

from src.cart.models import Cart, CartItem
from src.cart.queries import (
    DELETE_ALL_CART_ITEMS,
    DELETE_CART_ITEM,
    INSERT_CART,
    INSERT_OR_REPLACE_CART_ITEM,
    SELECT_CART_BY_USER_ID,
    SELECT_CART_ITEMS,
)
from src.common.repository import Repository
from src.common.sqlite_model import new_id_bytes


class CartRepository(Repository):
    def __init__(self, database_path: str) -> None:
        super().__init__(database_path)

    def get_or_create_cart(self, user_id: bytes) -> Cart:
        with self.connect() as connection:
            row = connection.execute(SELECT_CART_BY_USER_ID, (user_id,)).fetchone()
            if row:
                cart = Cart(**row)
            else:
                cart_id = new_id_bytes()
                connection.execute(INSERT_CART, (cart_id, user_id))
                cart = Cart(cart_id=cart_id, user_id=user_id)
            items = self._select_cart_items(connection, cart.cart_id)
            return replace(cart, items=items)

    def add_or_update_item(
        self, *, user_id: bytes, product_id: bytes, quantity: int
    ) -> Cart:
        with self.connect() as connection:
            row = connection.execute(SELECT_CART_BY_USER_ID, (user_id,)).fetchone()
            if row:
                cart = Cart(**row)
            else:
                cart_id = new_id_bytes()
                connection.execute(INSERT_CART, (cart_id, user_id))
                cart = Cart(cart_id=cart_id, user_id=user_id)
            connection.execute(
                INSERT_OR_REPLACE_CART_ITEM, (cart.cart_id, product_id, quantity)
            )
            items = self._select_cart_items(connection, cart.cart_id)
            return replace(cart, items=items)

    def remove_item(self, *, user_id: bytes, product_id: bytes) -> Cart:
        with self.connect() as connection:
            row = connection.execute(SELECT_CART_BY_USER_ID, (user_id,)).fetchone()
            if not row:
                return Cart(user_id=user_id)
            cart = Cart(**row)
            connection.execute(DELETE_CART_ITEM, (cart.cart_id, product_id))
            items = self._select_cart_items(connection, cart.cart_id)
            return replace(cart, items=items)

    def clear_items(self, *, user_id: bytes) -> Cart:
        with self.connect() as connection:
            row = connection.execute(SELECT_CART_BY_USER_ID, (user_id,)).fetchone()
            if not row:
                return Cart(user_id=user_id)
            cart = Cart(**row)
            connection.execute(DELETE_ALL_CART_ITEMS, (cart.cart_id,))
            return replace(cart, items=[])

    def _select_cart_items(self, connection, cart_id: bytes) -> list[CartItem]:
        rows = connection.execute(SELECT_CART_ITEMS, (cart_id,)).fetchall()
        return [CartItem(**row) for row in rows]
