ALTER TABLE products RENAME TO products_old;

CREATE TABLE products (
    product_id BLOB PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    created_at TEXT NOT NULL
);

INSERT INTO products (product_id, name, code, price_cents, created_at)
SELECT randomblob(16), name, code, price_cents, created_at
FROM products_old
ORDER BY id ASC;

DROP TABLE products_old;
