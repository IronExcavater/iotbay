CREATE TABLE payment_methods (
    payment_method_id BLOB PRIMARY KEY,
    customer_id BLOB NOT NULL,
    type TEXT NOT NULL,
    cardholder_name TEXT NOT NULL,
    card_last4 TEXT NOT NULL,
    expiry TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(user_id)
);