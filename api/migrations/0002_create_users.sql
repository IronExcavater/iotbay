CREATE TABLE IF NOT EXISTS addresses (
    address_id BLOB PRIMARY KEY,
    address_line_one TEXT NOT NULL,
    address_line_two TEXT NOT NULL,
    suburb TEXT NOT NULL,
    state TEXT NOT NULL,
    postcode TEXT NOT NULL,
    country TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    user_id BLOB PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'staff')),
    status TEXT NOT NULL CHECK (
        status IN ('unverified', 'active', 'disabled')
    ),
    address_id BLOB REFERENCES addresses (address_id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
