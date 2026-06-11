-- Sprint 6: Founder Business Management
-- Adds status column to businesses table.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'disabled'));
