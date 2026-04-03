SELECT
    products.*,
    audit_log.created_at AS created_at,
    audit_log.updated_at AS updated_at
FROM products
JOIN entity_audit_log AS audit_log
    ON audit_log.entity_type = ?
   AND audit_log.entity_id = products.product_id
ORDER BY audit_log.created_at ASC, products.code ASC
