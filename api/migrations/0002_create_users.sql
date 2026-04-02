CREATE TABLE IF NOT EXISTS addresses (
    address_id BLOB PRIMARY KEY,
    provider TEXT NOT NULL,
    provider_address_id TEXT NOT NULL UNIQUE,
    formatted_address TEXT NOT NULL,
    address_line_one TEXT NOT NULL,
    address_line_two TEXT NOT NULL,
    suburb TEXT NOT NULL,
    state TEXT NOT NULL,
    postcode TEXT NOT NULL,
    country TEXT NOT NULL,
    latitude REAL,
    longitude REAL
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
    )
);

CREATE TABLE IF NOT EXISTS customers (
    user_id BLOB PRIMARY KEY REFERENCES users (user_id) ON DELETE CASCADE,
    address_id BLOB REFERENCES addresses (address_id) ON DELETE SET NULL,
    phone_number TEXT
);

CREATE TABLE IF NOT EXISTS staff (
    user_id BLOB PRIMARY KEY REFERENCES users (user_id) ON DELETE CASCADE,
    designation TEXT,
    permission TEXT NOT NULL CHECK (permission IN ('admin', 'superadmin'))
);

CREATE TABLE IF NOT EXISTS user_sessions (
    session_id BLOB PRIMARY KEY,
    user_id BLOB NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    session_token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
ON user_sessions (user_id);

CREATE TABLE IF NOT EXISTS user_tokens (
    user_token_id BLOB PRIMARY KEY,
    user_id BLOB NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    purpose TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    UNIQUE (user_id, purpose)
);

CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id
ON user_tokens (user_id);

CREATE TABLE IF NOT EXISTS entity_audit_log (
    entity_type TEXT NOT NULL,
    entity_id BLOB NOT NULL,
    created_at TEXT NOT NULL,
    created_by_user_id BLOB,
    updated_at TEXT NOT NULL,
    updated_by_user_id BLOB,
    PRIMARY KEY (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_audit_log_entity
ON entity_audit_log (entity_type, entity_id);
