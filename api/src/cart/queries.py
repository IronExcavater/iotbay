SELECT_CART_BY_USER_ID = """
SELECT cart_id, user_id
FROM carts
WHERE user_id = ?
"""

SELECT_CART_ITEMS = """
SELECT
    cart_items.cart_id,
    cart_items.product_id,
    cart_items.quantity,
    products.name,
    products.code,
    products.price_cents,
    products.media_urls_json
FROM cart_items
JOIN products ON products.product_id = cart_items.product_id
WHERE cart_items.cart_id = ?
"""

INSERT_CART = """
INSERT INTO carts (cart_id, user_id)
VALUES (?, ?)
"""

INSERT_OR_REPLACE_CART_ITEM = """
INSERT INTO cart_items (cart_id, product_id, quantity)
VALUES (?, ?, ?)
ON CONFLICT(cart_id, product_id) DO UPDATE SET quantity = excluded.quantity
"""

DELETE_CART_ITEM = """
DELETE FROM cart_items
WHERE cart_id = ? AND product_id = ?
"""

DELETE_ALL_CART_ITEMS = """
DELETE FROM cart_items
WHERE cart_id = ?
"""
