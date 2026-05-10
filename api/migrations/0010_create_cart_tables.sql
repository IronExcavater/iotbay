CREATE TABLE IF NOT EXISTS carts (
    cart_id BLOB PRIMARY KEY,
    user_id BLOB NOT NULL UNIQUE REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_carts_user_id
ON carts (user_id);

CREATE TABLE IF NOT EXISTS cart_items (
    cart_id BLOB NOT NULL REFERENCES carts (cart_id) ON DELETE CASCADE,
    product_id BLOB NOT NULL REFERENCES products (product_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (cart_id, product_id)
);
