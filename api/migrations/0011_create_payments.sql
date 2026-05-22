CREATE TABLE IF NOT EXISTS payments (
    payment_id BLOB PRIMARY KEY,
    order_id BLOB NOT NULL REFERENCES orders (order_id) ON DELETE CASCADE,
    user_id BLOB NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
    card_last_four TEXT NOT NULL,
    card_holder TEXT NOT NULL,
    paid_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);