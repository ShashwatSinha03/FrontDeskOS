-- 005_staff_profiles_extend.sql
-- Extend staff_profiles with invitation and status fields.

ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'accepted'
    CHECK (status IN ('pending', 'accepted', 'suspended')),
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
