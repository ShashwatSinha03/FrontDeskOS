# Authentication & RBAC — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace API-key-based access with Supabase Auth + RBAC. Founder logs in to `/ops`, owners/staff log in to their business dashboards.

**Architecture:** New `profiles` table for platform identity. Extended `staff_profiles` for business membership. Express middleware stack verifies Bearer tokens via `supabase.auth.getUser()`. Next.js middleware + layouts protect routes. Single login page at `/login` with redirect preservation.

**Tech Stack:** Supabase Auth, `@supabase/ssr` (frontend), `@supabase/supabase-js` (backend), Express middleware, Next.js middleware

**Design doc:** `docs/plans/2026-06-11-auth-rbac-design.md`

---

### Task 1: Create profiles table migration

**Files:**
- Create: `database/migrations/004_profiles.sql`
- Create: `database/migrations/005_staff_profiles_extend.sql`

**Step 1: Write migration 004_profiles.sql**

```sql
-- 004_profiles.sql
-- Platform-level identity for authenticated users.

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  global_role VARCHAR(50) NOT NULL DEFAULT 'USER'
    CHECK (global_role IN ('SUPER_ADMIN', 'USER')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_global_role ON profiles(global_role);

-- Auto-create profile on user signup via trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, global_role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'USER'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

**Step 2: Write migration 005_staff_profiles_extend.sql**

```sql
-- 005_staff_profiles_extend.sql
-- Extend staff_profiles with invitation and status fields.

ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES staff_profiles(id),
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'accepted'
    CHECK (status IN ('pending', 'accepted', 'suspended')),
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Backfill existing rows as accepted
UPDATE staff_profiles SET status = 'accepted' WHERE status IS NULL;
```

### Task 2: Seed SUPER_ADMIN profile for existing founder user

**Files:**
- Modify: `database/seed.sql`

The onboarding wizard already creates a Supabase auth user for Shashwat (the founder). We need to ensure a `profiles` record exists with `global_role = 'SUPER_ADMIN'`.

Add to seed:
```sql
-- Ensure founder has SUPER_ADMIN profile
-- Uses the existing auth.users id from seed data
INSERT INTO profiles (id, email, full_name, global_role)
VALUES ('00000000-0000-0000-0000-000000000001', 'shashwat@frontdeskos.com', 'Shashwat', 'SUPER_ADMIN')
ON CONFLICT (id) DO UPDATE SET global_role = 'SUPER_ADMIN';
```

### Task 3: Create Supabase client singleton (backend)

**Files:**
- Create: `backend/src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import config from '../config';

export const supabaseAdmin = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

### Task 4: Build authenticate middleware

**Files:**
- Create: `backend/src/middleware/authenticate.ts`

Supports two auth methods:
1. Bearer token → `supabase.auth.getUser()` → verifies token
2. x-api-key header → verifies against config.ADMIN_API_KEY

Creates `req.authContext = { type: 'user' | 'service', userId?: string, service?: string }`.

Calls `next()` on success. Returns 401 on failure.

### Task 5: Build loadProfile middleware

**Files:**
- Create: `backend/src/middleware/load-profile.ts`

Requires `req.authContext`. Loads `profiles` record by `authContext.userId`. Attaches to `req.profile`.

If no profile found for a user auth context, auto-creates one (defensive — handles race with trigger).

Returns 401 if user auth context has no profile.

### Task 6: Build loadMembership middleware

**Files:**
- Create: `backend/src/middleware/load-membership.ts`

Requires `req.authContext`. For routes with a `businessId` param or `slug` param, loads `staff_profiles` record matching `user_id` + `business_id`.

Resolves `business_id` from `slug` if needed (join with businesses table).

Attaches to `req.membership`.

### Task 7: Build requireSuperAdmin middleware

**Files:**
- Create: `backend/src/middleware/require-super-admin.ts`

Checks `req.profile.global_role === 'SUPER_ADMIN'`. Returns 403 if not.

### Task 8: Build requireBusinessRole middleware

**Files:**
- Create: `backend/src/middleware/require-business-role.ts`

Factory function: `requireBusinessRole(...roles: string[])`.

Checks `req.membership.role` is in allowed roles. Returns 403 if not.

### Task 9: Wire middleware into backend routes

**Files:**
- Modify: `backend/src/routes/api.routes.ts`

Add `authenticate` + `loadProfile` + `requireSuperAdmin` to `founderRouter` path.

Add `authenticate` + `loadProfile` + `loadMembership` + `requireBusinessRole` to `adminRouter` path.

Ensure existing `requireApiKey` still works for service auth.

### Task 10: Install frontend Supabase packages

**Files:**
- Modify: `frontend/package.json`

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Task 11: Create Supabase browser client

**Files:**
- Create: `frontend/src/lib/supabase/client.ts`

Browser client using `@supabase/ssr` `createBrowserClient`:
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Task 12: Create Supabase server client

**Files:**
- Create: `frontend/src/lib/supabase/server.ts`

Server client using `@supabase/ssr` `createServerClient` with cookie handling:
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );
}
```

### Task 13: Create auth context provider

**Files:**
- Create: `frontend/src/lib/auth-context.tsx`

React context providing:
- `user` (Supabase User | null)
- `profile` (profiles row | null)
- `membership` (staff_profiles row | null)
- `isLoading`
- `signIn(email, password)`
- `signOut()`
- `refreshProfile()`

Uses Supabase browser client. Calls backend `/api/auth/me` to load full profile + membership.

### Task 14: Create login page

**Files:**
- Create: `frontend/src/app/login/page.tsx`

Single login page at `/login`.

Features:
- Email + password form
- Client-side validation
- Loading state
- Error display
- "Forgot password?" link
- Reads `redirect` from searchParams
- On success: redirect or role-based redirect

### Task 15: Create forgot password page

**Files:**
- Create: `frontend/src/app/login/forgot/page.tsx`

Email input → calls `supabase.auth.resetPasswordForEmail()` → success message with instructions.

### Task 16: Create reset password page

**Files:**
- Create: `frontend/src/app/login/reset/page.tsx`

New password form → calls `supabase.auth.updateUser({ password })` → redirect to login.

### Task 17: Create auth callback route

**Files:**
- Create: `frontend/src/app/auth/callback/route.ts`

Next.js route handler for Supabase Auth callback (handles email confirmation, password reset redirects).

### Task 18: Add auth to Next.js middleware

**Files:**
- Modify: `frontend/src/middleware.ts`

Add auth checks to existing middleware:

Protected route patterns:
- `/ops/*` → require authenticated + SUPER_ADMIN
- `/:slug/admin/*` → require authenticated + business membership

Logic:
1. Get Supabase session from cookies
2. If no session and route is protected → redirect to `/login?redirect=<current_path>`
3. If session exists → verify role/membership
4. If wrong role → redirect to `/unauthorized` or appropriate fallback
5. Allow public routes through unchanged

### Task 19: Add env vars configuration

**Files:**
- Modify: `frontend/.env`
- Modify: `frontend/.env.example`

Add to both:
```
NEXT_PUBLIC_SUPABASE_URL=https://dndbfkhrndrcwoknivxt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

The anon key is available from the Supabase project dashboard (not the service role key — anon key is safe for client-side).

### Task 20: Protect Founder OS layout

**Files:**
- Modify: `frontend/src/app/ops/layout.tsx`

Add auth check:
- Get server-side session
- Load profile
- Verify SUPER_ADMIN
- Redirect to `/login?redirect=/ops` if unauthenticated
- Redirect to `/unauthorized` if not SUPER_ADMIN

### Task 21: Protect Tenant Dashboard layout

**Files:**
- Modify: `frontend/src/app/[businessSlug]/admin/layout.tsx`

Add auth check:
- Get server-side session
- Load profile + membership
- Verify business membership exists for this slug
- Verify membership is accepted (not pending/suspended)
- Redirect to `/login?redirect=...` if unauthenticated
- Redirect to `/unauthorized` if no membership

### Task 22: Build /ops/users page (SUPER_ADMIN only)

**Files:**
- Create: `frontend/src/app/ops/users/page.tsx`
- Create: `backend/src/routes/admin-users.routes.ts` (if needed)

List all users with:
- email, name, global_role
- business memberships
- status

Actions:
- Suspend/activate user (updates `profiles` or `staff_profiles`)
- Remove membership
- Change business role

SUPER_ADMIN only. Protected by `requireSuperAdmin` middleware.

### Task 23: Build Team management page (Owner only)

**Files:**
- Create: `frontend/src/app/[businessSlug]/admin/settings/team/page.tsx`
- Create: `backend/src/routes/team.routes.ts`

Owner can:
- View team members
- Invite staff (create pending invitation)
- Change role (owner → manager, staff)
- Suspend/remove staff

Protected by `requireBusinessRole('owner')`.

### Task 24: Build invitation flow

**Files:**
- Modify relevant routes and components

When owner invites staff:
1. Owner enters email + role + name
2. Backend calls `supabase.auth.admin.inviteUserByEmail()`
3. Creates `staff_profiles` record with `status: 'pending'`, `invited_by`, `invited_at`
4. User receives email → sets password → creates profile via trigger → `accepted_at` updated

### Task 25: Update frontend API calls to use session

**Files:**
- Modify: `frontend/src/lib/api.ts` (or wherever the fetch wrapper lives)

Update the fetch wrapper to:
1. Get current Supabase session
2. Attach `Authorization: Bearer <access_token>` header
3. Keep `x-api-key` as fallback during transition
4. Remove fallback once all routes are verified on session auth

### Task 26: Security review

**Verification checklist:**

- [ ] `profiles` table has RLS policies matching auth
- [ ] `staff_profiles` has RLS policies matching auth
- [ ] No unprotected routes remain in Founder OS
- [ ] No unprotected routes remain in tenant admin
- [ ] SUPER_ADMIN cannot access tenant-only routes without proper middleware
- [ ] Owner cannot access other businesses
- [ ] Staff cannot access billing/settings
- [ ] Unauthenticated requests return 401
- [ ] API keys still work for cron/service calls
- [ ] Onboarding wizard still works (uses service role key directly)
- [ ] Login page has rate limiting
- [ ] Tokens are verified on every request (no caching)
- [ ] Middleware order is correct: auth → profile → membership → role

### Task 27: End-to-end verification

Test each scenario:

1. Unauthenticated → navigate to `/ops` → redirect to `/login?redirect=/ops`
2. Unauthenticated → navigate to `/acme-dental/admin` → redirect to `/login?redirect=/acme-dental/admin`
3. Founder login → redirect to `/ops`
4. Founder → navigate to any business admin → blocked/redirected
5. Owner login → redirect to first business admin
6. Owner → navigate to another business's admin → blocked
7. Manager login → access leads/appointments → blocked from billing
8. Staff login → access appointments → blocked from leads/escalations/billing
9. Owner → invite staff → staff receives email → staff sets password → staff logs in
10. Forgot password → receives email → resets password → logs in
