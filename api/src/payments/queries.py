SELECT_PAYMENT_BY_ORDER_ID = """
SELECT
    payment_id,
    order_id,
    user_id,
    payment_method_id,
    amount_cents,
    status,
    card_last4,
    card_holder,
    paid_at
FROM payments
WHERE order_id = ?
"""

SELECT_PAYMENTS_BY_USER_ID = """
SELECT
    payment_id,
    order_id,
    user_id,
    payment_method_id,
    amount_cents,
    status,
    card_last4,
    card_holder,
    paid_at
FROM payments
WHERE user_id = ?
ORDER BY paid_at DESC
"""

# CHANGED: column card_last_four -> card_last4, added payment_method_id
INSERT_PAYMENT = """
INSERT INTO payments (
    payment_id,
    order_id,
    user_id,
    payment_method_id,
    amount_cents,
    status,
    card_last4,
    card_holder,
    paid_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
"""
