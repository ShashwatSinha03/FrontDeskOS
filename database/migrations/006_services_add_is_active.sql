-- 006_services_add_is_active.sql
-- Add soft-delete support for services.

ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Backfill existing services as active
UPDATE services SET is_active = TRUE WHERE is_active IS NULL;
