ALTER TABLE products RENAME TO products_old;

-- Stage the converted rows so each new UUID stays aligned with the original
-- created_at value when backfilling product audit history.
CREATE TABLE products_new (
    product_id BLOB PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    created_at TEXT NOT NULL
);

INSERT INTO products_new (product_id, name, code, price_cents, created_at)
SELECT randomblob(16), name, code, price_cents, created_at
FROM products_old
ORDER BY id ASC;

CREATE TABLE products (
    product_id BLOB PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0)
);

INSERT INTO products (product_id, name, code, price_cents)
SELECT product_id, name, code, price_cents
FROM products_new;

INSERT INTO entity_audit_log (
    entity_type,
    entity_id,
    created_at,
    created_by_user_id,
    updated_at,
    updated_by_user_id
)
SELECT
    'product',
    product_id,
    created_at,
    NULL,
    created_at,
    NULL
FROM products_new;

DROP TABLE products_old;
DROP TABLE products_new;
