CREATE TABLE IF NOT EXISTS user_sessions (
    session_id BLOB PRIMARY KEY,
    user_id BLOB NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    session_token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
ON user_sessions (user_id);
