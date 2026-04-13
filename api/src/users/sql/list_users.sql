SELECT
    users.*,
    audit_log.created_at AS created_at,
    audit_log.updated_at AS updated_at,
    customers.phone_number AS phone_number,
    addresses.formatted_address AS address_label,
    addresses.address_line_one AS address_line_one,
    addresses.address_line_two AS address_line_two,
    addresses.suburb AS suburb,
    addresses.state AS state,
    addresses.postcode AS postcode,
    addresses.country AS country,
    staff.staff_id AS staff_id,
    staff.designation AS designation,
    staff.permission AS permission
FROM users
JOIN entity_audit_log AS audit_log
    ON audit_log.entity_type = ?
   AND audit_log.entity_id = users.user_id
LEFT JOIN customers
    ON customers.user_id = users.user_id
LEFT JOIN addresses
    ON addresses.address_id = customers.address_id
LEFT JOIN staff
    ON staff.user_id = users.user_id
ORDER BY audit_log.created_at DESC, users.email ASC
