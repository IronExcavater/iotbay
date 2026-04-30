CREATE TABLE IF NOT EXISTS access_logs (
    access_log_id BLOB PRIMARY KEY,
    user_id BLOB NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    session_id BLOB NOT NULL,
    event_type TEXT NOT NULL CHECK (
        event_type IN ('login', 'logout', 'session_revoked')
    ),
    occurred_at TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_access_logs_user_occurred_at
ON access_logs (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_logs_occurred_at
ON access_logs (occurred_at DESC);

ALTER TABLE user_sessions
ADD COLUMN ended_at TEXT;

ALTER TABLE user_sessions
ADD COLUMN ended_reason TEXT;

ALTER TABLE user_sessions
ADD COLUMN last_seen_at TEXT;

ALTER TABLE user_sessions
ADD COLUMN mfa_verified_at TEXT;

ALTER TABLE user_sessions
ADD COLUMN trusted_token_id BLOB;

ALTER TABLE user_sessions
ADD COLUMN auth_method TEXT NOT NULL DEFAULT 'password';

UPDATE user_sessions
SET last_seen_at = created_at
WHERE last_seen_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_sessions_active_user_id
ON user_sessions (user_id, ended_at, expires_at DESC);

CREATE TABLE IF NOT EXISTS trusted_session_tokens (
    trusted_session_token_id BLOB PRIMARY KEY,
    user_id BLOB NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    last_used_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    revoked_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_trusted_session_tokens_user_id
ON trusted_session_tokens (user_id);

CREATE TABLE IF NOT EXISTS user_mfa_settings (
    user_id BLOB PRIMARY KEY REFERENCES users (user_id) ON DELETE CASCADE,
    email_enabled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    enabled_at TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_challenges (
    auth_challenge_id BLOB PRIMARY KEY,
    user_id BLOB NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    purpose TEXT NOT NULL,
    delivery_email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    requested_trust INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    last_sent_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    completed_at TEXT,
    invalidated_at TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_auth_challenges_user_id
ON auth_challenges (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
    audit_event_id BLOB PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id BLOB NOT NULL,
    action TEXT NOT NULL,
    actor_user_id BLOB REFERENCES users (user_id) ON DELETE SET NULL,
    occurred_at TEXT NOT NULL,
    before_json TEXT,
    after_json TEXT,
    diff_json TEXT,
    origin TEXT NOT NULL DEFAULT 'direct',
    source_audit_event_id BLOB
);

CREATE INDEX IF NOT EXISTS idx_audit_events_entity
ON audit_events (entity_type, entity_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_actor
ON audit_events (actor_user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_occurred_at
ON audit_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_source
ON audit_events (source_audit_event_id);
