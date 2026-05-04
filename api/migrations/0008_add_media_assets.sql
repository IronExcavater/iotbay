CREATE TABLE IF NOT EXISTS media_assets (
    media_asset_id BLOB PRIMARY KEY,
    content_type TEXT NOT NULL,
    data BLOB NOT NULL,
    created_at TEXT NOT NULL
);
