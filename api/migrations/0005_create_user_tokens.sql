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
