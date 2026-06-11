-- Sprint 2: Identity Layer
-- Ensure staff_profiles exists with correct schema.
-- If the table already exists but lacks status or updated_at, this adds them safely.

CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_id)
);

-- Add status column if table pre-exists without it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_profiles' AND column_name = 'status') THEN
      ALTER TABLE public.staff_profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_profiles' AND column_name = 'updated_at') THEN
      ALTER TABLE public.staff_profiles ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own staff profiles
CREATE POLICY "users_read_own_staff_profiles" ON public.staff_profiles
  FOR SELECT
  USING (auth.uid() = user_id);
