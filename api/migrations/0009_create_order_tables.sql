CREATE TABLE IF NOT EXISTS orders (
    order_id BLOB PRIMARY KEY,
    user_id BLOB NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    address_id BLOB REFERENCES addresses (address_id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (
        status IN ('saved', 'paid', 'cancelled')
    ),
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id
ON orders (user_id);

CREATE TABLE IF NOT EXISTS order_items (
    order_id BLOB NOT NULL REFERENCES orders (order_id) ON DELETE CASCADE,
    product_id BLOB NOT NULL REFERENCES products (product_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
ON order_items (order_id);