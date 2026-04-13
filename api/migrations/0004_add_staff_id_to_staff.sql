ALTER TABLE staff ADD COLUMN staff_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_staff_id
ON staff (staff_id)
WHERE staff_id IS NOT NULL;
