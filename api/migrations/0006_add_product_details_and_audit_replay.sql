ALTER TABLE products
ADD COLUMN description TEXT NOT NULL DEFAULT '';

ALTER TABLE products
ADD COLUMN media_urls_json TEXT NOT NULL DEFAULT '[]';

-- origin and source_audit_event_id already created in 0005_add_user_access_management.sql

CREATE INDEX IF NOT EXISTS idx_audit_events_source
ON audit_events (source_audit_event_id);
