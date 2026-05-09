SELECT_ORDER_BY_ID = """
SELECT
    order_id,
    user_id,
    address_id,
    status,
    total_cents,
    created_at,
    updated_at
FROM orders
WHERE order_id = ?
"""

LIST_ORDERS_BY_USER = """
SELECT
    order_id,
    user_id,
    address_id,
    status,
    total_cents,
    created_at,
    updated_at
FROM orders
WHERE user_id = ?
ORDER BY created_at DESC
"""

SELECT_ORDER_ITEMS = """
SELECT
    order_items.order_id,
    order_items.product_id,
    order_items.quantity,
    products.name,
    products.code,
    products.price_cents,
    products.media_urls_json
FROM order_items
JOIN products ON products.product_id = order_items.product_id
WHERE order_items.order_id = ?
"""

INSERT_ORDER = """
INSERT INTO orders (order_id, user_id, address_id, status,
 total_cents, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
"""

INSERT_ORDER_ITEM = """
INSERT INTO order_items (order_id, product_id, quantity)
VALUES (?, ?, ?)
"""

UPDATE_ORDER_STATUS = """
UPDATE orders
SET status = ?, updated_at = ?
WHERE order_id = ?
"""
