SELECT_ORDER_BY_ID = """
SELECT
    order_id, user_id, address_id, status, total_cents,
    shipping_address_line_one, address_line_two, shipping_suburb, shipping_state,
    shipping_postcode, shipping_country,
    created_at, updated_at
FROM orders
WHERE order_id = ?
"""

LIST_ORDERS_BY_USER = """
SELECT
    order_id, user_id, address_id, status, total_cents,
    shipping_address_line_one, address_line_two, shipping_suburb, shipping_state,
    shipping_postcode, shipping_country,
    created_at, updated_at
FROM orders
WHERE user_id = ?
ORDER BY created_at DESC
"""

SEARCH_ORDERS_BY_USER = """
SELECT
    order_id, user_id, address_id, status, total_cents,
    shipping_address_line_one, address_line_two, shipping_suburb, shipping_state,
    shipping_postcode, shipping_country,
    created_at, updated_at
FROM orders
WHERE user_id = ?
    AND (? IS NULL OR order_id = ?)
    AND (? IS NULL OR DATE(created_at) = ?)
ORDER BY created_at DESC
"""

LIST_ALL_ORDERS = """
SELECT
    order_id, user_id, address_id, status, total_cents,
    shipping_address_line_one, address_line_two, shipping_suburb, shipping_state,
    shipping_postcode, shipping_country,
    created_at, updated_at
FROM orders
ORDER BY created_at DESC
"""

SELECT_ORDER_ITEMS = """
SELECT
    order_items.order_id,
    order_items.product_id,
    order_items.quantity,
    order_items.price_cents,
    products.name,
    products.code,
    products.media_urls_json
FROM order_items
JOIN products ON products.product_id = order_items.product_id
WHERE order_items.order_id = ?
"""

INSERT_ORDER = """
INSERT INTO orders (
    order_id, user_id, address_id, status, total_cents,
    shipping_address_line_one, address_line_two, shipping_suburb, shipping_state,
    shipping_postcode, shipping_country,
    created_at, updated_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""

INSERT_ORDER_ITEM = """
INSERT INTO order_items (order_id, product_id, quantity, price_cents)
VALUES (?, ?, ?, ?)
"""

UPDATE_ORDER_STATUS = """
UPDATE orders
SET status = ?, updated_at = ?
WHERE order_id = ?
"""

AJUST_PRODUCT_STOCK = """
UPDATE products
SET stock = stock - ?
WHERE product_id = ?
    AND stock >= ?
"""

UPDATE_ORDER_ADDRESS = """
UPDATE orders 
SET 
    shipping_address_line_one = ?,
    address_line_two = ?,
    shipping_suburb = ?,
    shipping_state = ?,
    shipping_postcode = ?,
    shipping_country = ?,
    updated_at = ?
WHERE order_id = ?
"""
