ALTER TABLE products
ADD COLUMN description TEXT NOT NULL DEFAULT '';

ALTER TABLE products
ADD COLUMN media_urls_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE audit_events
ADD COLUMN origin TEXT NOT NULL DEFAULT 'direct';

ALTER TABLE audit_events
ADD COLUMN source_audit_event_id BLOB;

CREATE INDEX IF NOT EXISTS idx_audit_events_source
ON audit_events (source_audit_event_id);
