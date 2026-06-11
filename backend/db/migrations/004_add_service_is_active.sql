ALTER TABLE services
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_services_active
ON services(business_id) WHERE is_active = TRUE;
