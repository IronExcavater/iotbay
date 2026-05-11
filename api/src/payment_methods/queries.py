LIST_PAYMENT_METHODS = """
SELECT
    payment_method_id,
    customer_id,
    type,
    cardholder_name,
    card_last4,
    expiry,
    created_at
FROM payment_methods
WHERE customer_id = ?
ORDER BY created_at DESC
"""

INSERT_PAYMENT_METHOD = """
INSERT INTO payment_methods (
    payment_method_id,
    customer_id,
    type,
    cardholder_name,
    card_last4,
    expiry,
    created_at
)
VALUES (?, ?, ?, ?, ?, ?, ?)
"""

DELETE_PAYMENT_METHOD = """
DELETE FROM payment_methods
WHERE payment_method_id = ?
"""
