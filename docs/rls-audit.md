# FrontDeskOS — RLS Architecture Audit

> **Status:** NOT APPROVED FOR IMPLEMENTATION — Critical architectural blocker found
>
> Do NOT generate SQL migrations yet.
> Do NOT enable RLS yet.
> Do NOT modify the database.

---

## Table of Contents

1. [Table Inventory](#table-inventory)
2. [Dependency Graph](#dependency-graph)
3. [RLS Policy Matrix](#rls-policy-matrix)
4. [Founder Access Design](#founder-access-design)
5. [RLS Readiness Report](#rls-readiness-report)
6. [Safe Rollout Plan](#safe-rollout-plan)
7. [Risks](#risks)
8. [Recommended First Migration](#recommended-first-migration)

---

## 🚨 Critical Architectural Blocker

> **The entire backend cannot benefit from RLS in its current architecture.**
> Do not proceed past this section until resolved.

### The Problem

Every repository and controller in the backend accesses PostgreSQL through a single `pg.Pool` (defined in `backend/src/config/db.ts`):

```ts
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});
```

The `DATABASE_URL` in Supabase connects as the **`postgres` superuser**. PostgreSQL superusers have the `bypassrls` attribute set to `true`, which means **RLS policies are NEVER evaluated** for queries made through this connection.

Furthermore, the `auth.uid()` function used in RLS policies reads from `request.jwt.claim.sub`, which is only populated when a connection is made through Supabase's auth layer (e.g., via `supabase.from()` with a valid JWT). Direct `pg.Pool` connections have no JWT context, so `auth.uid()` returns `NULL`.

### What This Means

| Claim | Reality |
|-------|---------|
| "RLS will be a second layer of defense" | ❌ RLS is **not enforced** for any current query |
| "Policies can use `auth.uid()`" | ❌ `auth.uid()` returns `NULL` on all current connections |
| "Existing RLS on `profiles` and `staff_profiles` works" | ❌ Those policies are **not evaluated** for pool queries |
| "Phase 1 can enable RLS on services" | ❌ Enabling RLS has **zero effect** — all queries bypass it |

### Resolution Options

#### Option A: Create an Application Role (Recommended)

1. Create a new PostgreSQL role (e.g., `app_user`) that:
   - Is NOT a superuser (`NOLOGIN` or `LOGIN` with limited privileges)
   - Has `GRANT USAGE ON SCHEMA public TO app_user`
   - Has `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user`
2. Create a new connection pool that connects as `app_user`
3. Before each request, set the user context:
   ```sql
   SET LOCAL role = 'app_user';
   SELECT set_config('request.jwt.claim.sub', $1, true);
   ```
4. RLS policies now evaluate correctly using `auth.uid()` (which reads `request.jwt.claim.sub`)

#### Option B: Use Supabase Client for All Queries

Replace all `pool.query()` calls with `supabase.from()` calls using a server-side Supabase client initialized with a user's JWT. This is a massive refactor (hundreds of queries across 11+ repositories).

#### Option C: Service Role Only (Current Pattern — Maintain)

Accept that the application cannot use RLS. Continue using application-level authorization (middleware + `business_id` filters in SQL). Add `business_id` checks to the 14+ queries that currently lack them.

### Recommendation

**Do not implement any RLS policies until Option A is executed.**

The application role approach requires:
1. A new migration to create the `app_user` role and grant permissions
2. A new connection pool configuration in the backend
3. Middleware to set `request.jwt.claim.sub` before each request
4. Modification to all repositories (minimal — just use the new pool)
5. Testing that `auth.uid()` returns the correct value

**Estimated effort:** 2-3 days of engineering, plus 1 week of testing.

---

## Table Inventory

### Current RLS State

Only 3 of 19 tables have any RLS configuration:

| Table | RLS Status |
|-------|------------|
| `profiles` | ENABLED — SELECT/UPDATE where `auth.uid() = id` |
| `staff_profiles` | ENABLED — SELECT where `auth.uid() = user_id` |
| `notifications` | EXPLICITLY DISABLED (`ALTER TABLE notifications DISABLE ROW LEVEL SECURITY`) |
| All others | **NO RLS** (implicitly disabled) |

### Full Classification

| # | Table | PK | `business_id` | `user_id` | Class | Sensitive | Notes |
|---|-------|----|---------------|-----------|-------|-----------|-------|
| 1 | `profiles` | `id` (FK→auth.users) | No | Yes (PK) | System | **High** — email, full_name, global_role | Already has basic RLS |
| 2 | `staff_profiles` | `id` (UUID) | **Yes** FK→businesses | **Yes** FK→auth.users | System | **High** — maps users to businesses | Already has basic RLS |
| 3 | `businesses` | `id` (UUID) | N/A (tenant root) | No | Public (read) / System (write) | Medium |
| 4 | `services` | `id` (UUID) | **Yes** FK→businesses | No | Public (active) / Tenant (all) | Low |
| 5 | `customers` | `id` (UUID) | **Yes** FK→businesses | No | Tenant | **High** — PII |
| 6 | `customer_sessions` | `id` (UUID) | **Yes** FK→businesses | No | Tenant | Medium |
| 7 | `customer_channels` | `id` (UUID) | Via customers | No | Tenant | Medium |
| 8 | `conversations` | `id` (UUID) | **Yes** FK→businesses | No | Tenant | **High** |
| 9 | `messages` | `id` (UUID) | **missing** | No | Tenant | **High** — full chat content |
| 10 | `appointments` | `id` (UUID) | **Yes** FK→businesses | No | Tenant | **High** |
| 11 | `escalations` | `id` (UUID) | **Yes** FK→businesses | No | Tenant | Medium |
| 12 | `knowledge_requests` | `id` (UUID) | **Yes** FK→businesses | No | Tenant | Low |
| 13 | `follow_ups` | `id` (UUID) | **Yes** FK→businesses | No | Tenant | Low |
| 14 | `voice_calls` | `id` (UUID) | **Yes** FK→businesses | No | Tenant | Medium |
| 15 | `customer_lifecycle_events` | `id` (UUID) | **Yes** FK→businesses | No | Tenant | Medium |
| 16 | `availability_schedules` | `id` (UUID) | **Yes** FK→businesses | No | Tenant | Low |
| 17 | `availability_overrides` | `id` (UUID) | **Yes** FK→businesses | No | Tenant | Low |
| 18 | `calendar_credentials` | `id` (UUID) | **Yes** FK→businesses | No | System | **High** — OAuth tokens |
| 19 | `notifications` | `id` (UUID) | **Yes** FK→businesses | No | Tenant | Low |

### Schema Anomalies Found

1. **`messages.business_id`**: Repository INSERTs it but core migration does not define the column. **Must be resolved before any RLS on messages.**
2. **`customer_lifecycle_events.changed_by`**: Repository queries it but migration does not define it. **Must be resolved.**
3. **`message_delivery_status` enum**: Created as a type but never used by any table.
4. **`update_updated_at_column()` function**: Defined but never attached to any table as a trigger.
5. **`appointments.rescheduled_from_id`**: Self-referencing FK only at application layer, not declared in DB.

---

## Dependency Graph

```
                        auth.users
                           │
              ┌────────────┼────────────┐
              │            │            │
          profiles    staff_profiles    │
                           │            │
                           ▼            │
                      businesses ◄──────┘
                      │   │   │   │
          ┌───────────┘   │   │   └──────────────────┐
          ▼               ▼   ▼                      ▼
      services      customers  calendar_credentials  notifications
                      │   │   │
          ┌───────────┘   │   └──────────────┐
          ▼               ▼                  ▼
  customer_sessions  conversations    customer_lifecycle_events
  customer_channels      │
                         ▼
                    messages
                    │    │
                    │    ▼
                    │  knowledge_requests
                    ▼
              escalations
                    │
                    ▼
              appointments
                    │
                    ▼
              voice_calls
                    │
                    ▼
              follow_ups
```

### Readiness Dependency Order

| Tier | Tables | Dependency |
|------|--------|------------|
| **0** | `profiles` | No dependency (already has RLS) |
| **0** | `auth.users` | Supabase-managed, read-only |
| **1** | `businesses`, `staff_profiles` | No parent dependency |
| **2** | `services`, `customers`, `calendar_credentials`, `notifications` | Depend on `businesses` |
| **3** | `customer_sessions`, `customer_channels`, `conversations`, `customer_lifecycle_events` | Depend on `customers` |
| **4** | `messages`, `escalations`, `knowledge_requests`, `appointments` | Depend on `conversations` |
| **5** | `voice_calls` | Depend on `appointments`/`conversations` |
| **6** | `follow_ups` | Depend on `voice_calls` |
| **7** | `availability_schedules`, `availability_overrides` | Depend on `businesses`, `services` |

---

## RLS Policy Matrix

### Common Policy Pattern

All tenant-isolated tables use a standard pattern:

```sql
-- Staff/owner belongs to a business via staff_profiles
-- Policy joins: current user → staff_profiles → business_id filter

CREATE POLICY tenant_select ON <table>
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM staff_profiles WHERE user_id = auth.uid()
    )
  );
```

### Per-Table Policy Design

#### `businesses`

| Operation | Who |
|-----------|-----|
| **SELECT** | Anyone (public listing data) |
| **SELECT (sensitive)** | Staff of business + SUPER_ADMIN |
| **INSERT** | SUPER_ADMIN only |
| **UPDATE** | SUPER_ADMIN only |
| **DELETE** | SUPER_ADMIN only |

#### `staff_profiles`

| Operation | Who |
|-----------|-----|
| **SELECT** | Staff of same business, SUPER_ADMIN, self |
| **INSERT** | Owner of business, SUPER_ADMIN |
| **UPDATE** | Owner of business, SUPER_ADMIN |
| **DELETE** | Owner, SUPER_ADMIN |

#### `services`

| Operation | Who |
|-----------|-----|
| **SELECT (active)** | Anyone (public) |
| **SELECT (all)** | Staff of business |
| **INSERT** | Owner, Staff, SUPER_ADMIN |
| **UPDATE** | Owner, Staff, SUPER_ADMIN |
| **DELETE** | Owner, SUPER_ADMIN |

#### `customers`

| Operation | Who |
|-----------|-----|
| **SELECT** | Staff of same business |
| **INSERT** | Staff of business (via chat/onboarding) |
| **UPDATE** | Staff of business |
| **DELETE** | Owner, SUPER_ADMIN |

#### `conversations`

| Operation | Who |
|-----------|-----|
| **SELECT** | Staff of same business |
| **INSERT** | System (agent creates conversations) — service-role |
| **UPDATE (close)** | Staff, Agent |
| **DELETE** | None (never deleted) |

#### `messages`

> **BLOCKER**: `business_id` column missing from migration. Must add first.

| Operation | Who |
|-----------|-----|
| **SELECT** | Staff of same business (via JOIN to conversations) |
| **INSERT** | System (agent), Customer session |
| **UPDATE** | None (immutable audit log) |
| **DELETE** | None |

#### `appointments`

| Operation | Who |
|-----------|-----|
| **SELECT** | Staff of business, the customer (via session) |
| **INSERT** | Staff, Agent |
| **UPDATE (status)** | Staff, Agent |
| **DELETE** | Owner, SUPER_ADMIN |

#### `notifications`

| Operation | Who |
|-----------|-----|
| **SELECT** | Staff of business |
| **INSERT** | System (service-role) |
| **UPDATE (markRead)** | Staff of business |
| **DELETE** | System (cleanup job) — service-role |

#### `calendar_credentials`

| Operation | Who |
|-----------|-----|
| **SELECT** | Owner, SUPER_ADMIN |
| **INSERT** | Owner, SUPER_ADMIN |
| **UPDATE** | Owner, SUPER_ADMIN |
| **DELETE** | Owner, SUPER_ADMIN |

**Tokens are sensitive — staff should NOT read OAuth tokens.**

#### Remaining Tables

`knowledge_requests`, `follow_ups`, `voice_calls`, `customer_lifecycle_events`, `customer_sessions`, `customer_channels`, `availability_schedules`, `availability_overrides`, `escalations`:

| Operation | Who |
|-----------|-----|
| **SELECT** | Staff of business |
| **INSERT** | Staff, System (service-role) |
| **UPDATE** | Staff, System (service-role) |
| **DELETE** | Owner, SUPER_ADMIN |

#### `profiles`

| Operation | Who |
|-----------|-----|
| **SELECT** | Self only + SUPER_ADMIN |
| **UPDATE** | Self only |
| **INSERT** | Auth trigger (`handle_new_user()`) |
| **DELETE** | SUPER_ADMIN (founder panel) |

---

## Founder Access Design

### Three Approaches Considered

**Approach A: Service Role Bypass (Current Pattern)**
Use `SUPABASE_SERVICE_ROLE_KEY` for SUPER_ADMIN operations. Already used in `onboarding.controller.ts`.

Pros: Already in use, proven pattern. No policy complexity.
Cons: All-or-nothing — if key leaks, RLS provides zero protection.

**Approach B: SUPER_ADMIN Policy Bypass (Recommended)**
Add to every RLS policy:
```sql
OR auth.uid() IN (SELECT id FROM profiles WHERE global_role = 'SUPER_ADMIN')
```

Pros: Actions logged by RLS. No service-role key exposure. Scoped by policy.
Cons: Every policy includes the condition. Tiny performance cost.

**Approach C: Admin-Scoped Policies**
Separate SUPER_ADMIN-only policies per table.

Pros: Clear separation. Individually auditable.
Cons: Two policies per table. Collision risk.

### Recommendation

**Adopt Approach B for API-facing tables. Keep Approach A (service role) only for:**

1. Background job schedulers (`findActiveByInactivity`, `findDueToProcess`)
2. Onboarding/auth user creation (already uses service role)
3. System-to-system internal operations

**Helper function to reduce policy bloat:**
```sql
CREATE FUNCTION auth.is_super_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND global_role = 'SUPER_ADMIN'
  );
$$ LANGUAGE sql STABLE;
```

**Example policy:**
```sql
CREATE POLICY tenant_select_customers ON customers
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM staff_profiles WHERE user_id = auth.uid()
    )
    OR auth.is_super_admin()
  );
```

---

## RLS Readiness Report

| # | Table | RLS Ready? | Why | Dependency Risk |
|---|-------|-----------|-----|-----------------|
| 1 | `profiles` | **READY** | Already has RLS, needs SUPER_ADMIN read | None |
| 2 | `staff_profiles` | **READY** | Already has RLS, needs expansion | None |
| 3 | `businesses` | **READY** | Straightforward | None |
| 4 | `services` | **READY** | Has `business_id`, public-read pattern | Low |
| 5 | `customers` | **NEEDS POLICY DESIGN** | PII tenant data | Low |
| 6 | `customer_sessions` | **NEEDS POLICY DESIGN** | Session-based access needs special pattern | Medium |
| 7 | `customer_channels` | **NEEDS POLICY DESIGN** | Same as sessions | Medium |
| 8 | `conversations` | **NEEDS POLICY DESIGN** | Clear pattern, session inserts | Low |
| 9 | `messages` | **DO NOT ENABLE YET** | `business_id` column missing | **HIGH** — schema anomaly |
| 10 | `appointments` | **NEEDS POLICY DESIGN** | Clear pattern | Low |
| 11 | `escalations` | **NEEDS POLICY DESIGN** | Clear pattern | Low |
| 12 | `knowledge_requests` | **READY** | Well-isolated in code | Low |
| 13 | `follow_ups` | **NEEDS POLICY DESIGN** | Global scheduler conflict | **Medium** |
| 14 | `voice_calls` | **NEEDS POLICY DESIGN** | Clear pattern | Low |
| 15 | `customer_lifecycle_events` | **DO NOT ENABLE YET** | `changed_by` column missing | **HIGH** — schema anomaly |
| 16 | `availability_schedules` | **READY** | Already well-isolated | Low |
| 17 | `availability_overrides` | **READY** | Already well-isolated | Low |
| 18 | `calendar_credentials` | **NEEDS POLICY DESIGN** | Owner-only pattern | Low |
| 19 | `notifications` | **DO NOT ENABLE YET** | Currently disabled; needs service-role insert | Low |

### Schema Blockers

Two tables cannot have RLS enabled until schema migrations fix missing columns:

1. **`messages`**: `business_id` column is used by `conversation.repository.ts:68` but doesn't exist in the migration.
2. **`customer_lifecycle_events`**: `changed_by` column is queried by `lifecycle-event.repository.ts:18` but doesn't exist in the migration.

### Global Scheduler Conflict

Two queries run as cross-tenant scans:

1. **`ConversationRepository.findActiveByInactivity()`** — reads all conversations, no business_id
2. **`FollowUpRepository.findDueToProcess()`** — reads all follow-ups, no business_id

**Resolution:** Wrap these in a service-role client that bypasses RLS. The scheduler is server-side only and never exposed via an API route.

---

## Safe Rollout Plan

### Phase 0 — Schema Fixes (PRE-REQUISITE)

| Step | Action | Verification |
|------|--------|-------------|
| 0.1 | `ALTER TABLE messages ADD COLUMN business_id UUID NOT NULL ...` | Check column exists |
| 0.2 | Backfill `messages.business_id` from `conversations` | Zero nulls |
| 0.3 | `ALTER TABLE customer_lifecycle_events ADD COLUMN changed_by UUID ...` | Check column exists |
| 0.4 | Backfill `customer_lifecycle_events.changed_by` | Zero nulls |
| 0.5 | Create `auth.is_super_admin()` helper function | `SELECT auth.is_super_admin()` works |

**Rollback:** `ALTER TABLE ... DROP COLUMN ...`

### Phase 1 — Low-Risk Tables

| Order | Table | Risk |
|-------|-------|------|
| 1 | `services` | Low — public read, tenant write |
| 2 | `knowledge_requests` | Low — well-isolated in code |
| 3 | `availability_schedules` | Low — well-isolated in code |
| 4 | `availability_overrides` | Low — well-isolated in code |

**Verification:** `SELECT COUNT(*) FROM services WHERE business_id = '<known>'` — same result before/after.

**Rollback:** `ALTER TABLE <table> DISABLE ROW LEVEL SECURITY;`

### Phase 2 — Core Tenant Tables

| Order | Table | Risk |
|-------|-------|------|
| 5 | `businesses` | Medium — write paths need verification |
| 6 | `notifications` | Medium — push notification writes |
| 7 | `customers` | **High** — PII, many code paths |
| 8 | `customer_sessions` | Medium — session-based access |
| 9 | `customer_channels` | Medium — channel identity |
| 10 | `escalations` | Medium — write from agent |
| 11 | `conversations` | **High** — cross-tenant scan exists |

**Verification:** Full QA pass — create customer, book appointment, send message, escalate, resolve.

### Phase 3 — High-Risk Tables

| Order | Table | Risk |
|-------|-------|------|
| 12 | `messages` | **CRITICAL** — needs column fix first |
| 13 | `customer_lifecycle_events` | **CRITICAL** — needs column fix first |
| 14 | `appointments` | High — booking flow |
| 15 | `voice_calls` | Medium — Twilio integration |
| 16 | `follow_ups` | Medium — global scheduler |
| 17 | `calendar_credentials` | Medium — OAuth tokens |

**Verification:** Full booking flow + scheduler run.

### Phase 4 — Expansion + Hardening

| Step | Action |
|------|--------|
| 4.1 | Add `profiles` SUPER_ADMIN read policy |
| 4.2 | Expand `staff_profiles` RLS policies |
| 4.3 | Enable RLS enforcement monitoring |
| 4.4 | Remove redundant application-level `business_id` checks (deferred) |
| 4.5 | Index analysis on all policy subqueries |

---

## Risks

### 1. Service Role Key Exposure
The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS. If compromised, RLS provides zero protection.

**Mitigation:** Rotate the key. Restrict to scheduler + onboarding only. Use anon key for all other ops.

### 2. Session-Based Insert for Chat
Anonymous chat users cannot use `auth.uid()`. RLS policies must use `app.session_id` session variable.

**Mitigation:** Set session variable in middleware; check in RLS:
```sql
current_setting('app.session_id', true) IN (
  SELECT session_id FROM customer_sessions WHERE business_id = <id>
)
```

### 3. Policy Performance
Every policy runs a subquery on `staff_profiles`. For high-traffic tables, this could be expensive.

**Mitigation:** `staff_profiles.user_id` has a UNIQUE index (already). Monitor `pg_stat_statements` after Phase 2.

### 4. SUPER_ADMIN Policy Bloat
Every policy repeats the SUPER_ADMIN check. Schema change to `profiles.global_role` requires updating all policies.

**Mitigation:** Use the `auth.is_super_admin()` helper function. One change point.

### 5. Service Role Still Used in CreateOwner
`onboarding.controller.ts` uses `createClient(url, SERVICE_ROLE_KEY)` for auth admin. Same client could query tenant tables without RLS.

**Mitigation:** Create a separate Supabase client specifically for auth admin operations. Never share it with tenant queries.

---

## Access Path Matrix

For every major subsystem, this table documents how the backend authenticates and which database role handles queries.

| System | Route File | Auth Middleware | Auth Source | DB Access Method | DB Role | RLS Effective? | Notes |
|--------|-----------|----------------|-------------|-----------------|---------|----------------|-------|
| **Founder OS** | `founder.routes.ts` | `authenticate` + `requireSuperAdmin` | User JWT (Bearer) | Direct `pool.query()` in controller | `postgres` (superuser) | **NO** | Controller uses raw SQL, not repositories. Bypasses RLS entirely. |
| **Onboarding Wizard** | `onboarding.routes.ts` | `authenticate` + `requireSuperAdmin` | User JWT (Bearer) | `onboardingRepository` (pool.query) + `supabase.auth.admin.createUser()` (service-role) | `postgres` (superuser) + `service_role` | **NO** | `createOwner()` uses `createClient(SUPABASE_SERVICE_ROLE_KEY)` — also bypasses RLS |
| **Settings CMS** | `settings.routes.ts` | `authenticate` + `loadMembership` + `requireOwner()` (write) | User JWT (Bearer) | `settings.controller.ts` via `pool.query()` + `businessRepository` | `postgres` (superuser) | **NO** | Membership loaded from DB, role-check in middleware |
| **Team Management** | `team.routes.ts` | `authenticate` + `loadMembership` + `requireOwner()` | User JWT (Bearer) | `team.controller.ts` via `pool.query()` | `postgres` (superuser) | **NO** | Also uses `createClient(SERVICE_ROLE_KEY)` for auth user creation |
| **Operations Dashboard** | `operational.routes.ts` | `authenticate` + `loadMembership` + `requireStaff()` | User JWT (Bearer) | `operationalController` via repositories + `pool.query()` | `postgres` (superuser) | **NO** | Repo queries include `business_id` filtering |
| **Analytics** | `analytics.routes.ts` | `authenticate` + `loadMembership` + `requireStaff()` | User JWT (Bearer) | `analyticsController` via repositories | `postgres` (superuser) | **NO** | Queries filter by `business_id` |
| **Notifications** | `notification.routes.ts` | `authenticate` + `loadMembership` + `requireStaff()` | User JWT (Bearer) | `notificationRepository` (pool.query) | `postgres` (superuser) | **NO** | Best-isolated repository — every method filters by `business_id` |
| **Booking Engine** | `api.routes.ts` (adminRouter) | `requireApiKey` | API key (`x-api-key`) | `appointmentController` via `appointmentService` + repositories | `postgres` (superuser) | **NO** | API key auth, not user JWT. Controllers take `businessId` from request body |
| **AI Receptionist** | `api.routes.ts` (publicRouter) | `resolveSession` (no auth) | Anonymous (session ID) | `chatService` via repositories + LLM | `postgres` (superuser) | **NO** | No authentication. Session ID in header/body. |
| **Public Website** | `api.routes.ts` (publicRouter) | None | None | `publicController` via `pool.query()` | `postgres` (superuser) | **NO** | Slug-based business lookup, no auth |
| **Public Booking Pages** | `api.routes.ts` (publicRouter) | None | None | `publicController` + `appointmentController` via `pool.query()` | `postgres` (superuser) | **NO** | Slots/booking via public endpoints |
| **Me / Profile** | `me.routes.ts` | `authenticate` + `loadMembership` | User JWT (Bearer) | Inline `pool.query()` | `postgres` (superuser) | **NO** | Reads profile + membership |

### Key Findings

1. **Every single subsystem** uses the same `pg.Pool` → `postgres` superuser connection. RLS is never enforced.
2. **Booking Engine** uses API key auth (`x-api-key`), not user JWT. No `auth.uid()` context exists.
3. **AI Receptionist** has no auth at all — uses anonymous session IDs.
4. **Founder OS** bypasses repositories entirely, using raw `pool.query()` with aggregate queries across all tenants.
5. **Onboarding** and **Team** use `supabase.auth.admin.createUser()` with the service role key for user creation — legitimate use, but same client could bypass RLS.

---

## RLS Compatibility Test Plan — Onboarding & CreateOwner

### Flow Analysis: Onboarding Publish

`POST /onboarding/publish` (now protected by `authenticate` + `requireSuperAdmin`):

| Step | Operation | Table(s) | Would RLS block? |
|------|-----------|----------|------------------|
| 1. Check idempotency | `SELECT` businesses where session_id matches | `businesses` (JSON path) | **YES** — if RLS on `businesses` requires `auth.uid() IN (user's businesses)`, SUPER_ADMIN can bypass via policy. Without SUPER_ADMIN bypass, this would fail. |
| 2. Check slug availability | `SELECT 1` from `businesses` | `businesses` | **YES** — same issue. Needs public-read policy or SUPER_ADMIN bypass. |
| 3. Create business | `INSERT INTO businesses` | `businesses` | **YES** — INSERT policy must allow SUPER_ADMIN. |
| 4. Create services (batch) | `INSERT INTO services` | `services` | **YES** — INSERT policy must allow caller. The caller (SUPER_ADMIN) is not yet associated with this business. Policy must use SUPER_ADMIN bypass. |
| 5. Create schedules (batch) | `INSERT INTO availability_schedules` | `availability_schedules` | **YES** — same issue as services. |

**Mitigation:** All onboarding operations must run via the service-role key or as SUPER_ADMIN with explicit bypass.

### Flow Analysis: CreateOwner

`POST /onboarding/owner` (now protected by `authenticate` + `requireSuperAdmin`):

| Step | Operation | Table(s) | Would RLS block? |
|------|-----------|----------|------------------|
| 1. Verify business exists | `SELECT` from `businesses` | `businesses` | **YES** — needs SUPER_ADMIN bypass |
| 2. Create auth user | `supabase.auth.admin.createUser()` | `auth.users` (Supabase-managed) | **NO** — service-role, not affected by RLS |
| 3. Insert staff_profiles | `INSERT INTO staff_profiles` | `staff_profiles` | **YES** — INSERT policy requires owner of this business. But the caller is SUPER_ADMIN, not an owner. |
| 4. Return owner credentials | No DB write | — | — |

**Critical finding:** Step 3 (INSERT into `staff_profiles`) is the highest-risk operation under RLS. The caller is a SUPER_ADMIN who is NOT a member of `staff_profiles` for this business. If RLS on `staff_profiles` requires `business_id IN (SELECT business_id FROM staff_profiles WHERE user_id = auth.uid())`, the SUPER_ADMIN would need a bypass. If they don't have one, **ownership assignment fails silently** and the tenant has no owner.

### Flow Analysis: AssignOwner (founder route)

`POST /api/ops/businesses/:id/assign-owner`:

| Step | Operation | Table(s) | Would RLS block? |
|------|-----------|----------|------------------|
| 1. Verify business exists | `pool.query('SELECT ... FROM businesses WHERE id = $1')` | `businesses` | **YES** — needs SUPER_ADMIN bypass |
| 2. Create auth user (optional) | `supabase.auth.admin.createUser()` | `auth.users` | **NO** — service-role |
| 3. DELETE existing owner | `DELETE FROM staff_profiles WHERE business_id = $1 AND role = 'owner'` | `staff_profiles` | **YES** — DELETE requires ownership |
| 4. INSERT new owner | `INSERT INTO staff_profiles` | `staff_profiles` | **YES** — INSERT requires ownership |

### Summary of Blocked Operations

| Operation | Blocker | Mitigation |
|-----------|---------|------------|
| Create business (onboarding) | INSERT on `businesses` without staff_profile relationship | Run via service-role, or SUPER_ADMIN bypass policy |
| Insert services (onboarding) | INSERT on `services` without staff_profile relationship | Same |
| Insert staff_profiles (createOwner) | INSERT on `staff_profiles` as non-owner | **Must** use service-role for this INSERT |
| Assign owner (founder) | DELETE + INSERT on `staff_profiles` | Service-role required |
| Transfer ownership (founder) | Multi-step transaction touching `staff_profiles` | Service-role required, or SECURITY DEFINER function |

### Recommendation

**Onboarding and founder operations must run under the service role.** These workflows create TENANTS and assign OWNERSHIP — they operate at a higher privilege level than any single tenant. No RLS policy can correctly gate these operations because the actor (SUPER_ADMIN or system) is intentionally outside the tenant isolation model.

---

## Required Security Indexes

Every `auth.uid()`-based policy runs a subquery on `staff_profiles`. Without proper indexes, these subqueries will be expensive.

| Table | Column(s) | Index Needed? | Currently Indexed? | Purpose |
|-------|-----------|---------------|-------------------|---------|
| `staff_profiles` | `user_id` | **YES** | YES (UNIQUE) | `WHERE user_id = auth.uid()` in every tenant policy |
| `staff_profiles` | `business_id` | **YES** | NO | `business_id IN (...)` — used in policy subqueries |
| `staff_profiles` | `user_id, role` | **YES** | NO | Owner-only policies: `WHERE user_id = auth.uid() AND role = 'owner'` |
| `staff_profiles` | `user_id, status` | **YES** | NO | Active membership check: `WHERE user_id = auth.uid() AND status = 'active'` |
| `profiles` | `id` | **YES** | YES (PK) | SUPER_ADMIN check: `WHERE id = auth.uid() AND global_role = 'SUPER_ADMIN'` |
| `profiles` | `global_role` | **YES** | NO | SUPER_ADMIN lookup: `WHERE global_role = 'SUPER_ADMIN'` |
| `businesses` | `id` | **YES** | YES (PK) | Business EXISTS check in policies |
| `businesses` | `slug` | **YES** | YES (UNIQUE) | Public lookup by slug |
| `customers` | `business_id` | **YES** | NO | `WHERE business_id IN (...)` |
| `conversations` | `business_id` | **YES** | NO | Same |
| `appointments` | `business_id` | **YES** | NO | Same |
| `messages` | `business_id` | **YES** | NO | Same (after column is added) |
| `services` | `business_id` | **YES** | NO | Same |
| `customer_sessions` | `session_id` | **YES** | YES (UNIQUE) | Anonymous session lookup |
| `notifications` | `business_id, is_read` | **YES** | YES (`idx_notifications_unread`) | Unread count queries |

### Critical Missing Indexes

These indexes must be created BEFORE any RLS policies are enabled on their respective tables:

```sql
CREATE INDEX idx_staff_profiles_business ON staff_profiles(business_id);
CREATE INDEX idx_staff_profiles_user_role ON staff_profiles(user_id, role);
CREATE INDEX idx_staff_profiles_user_status ON staff_profiles(user_id, status);
CREATE INDEX idx_profiles_global_role ON profiles(global_role);
CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_conversations_business ON conversations(business_id);
CREATE INDEX idx_appointments_business ON appointments(business_id);
CREATE INDEX idx_messages_business ON messages(business_id);
CREATE INDEX idx_services_business ON services(business_id);
```

### Performance Impact of Missing Indexes

Without `idx_staff_profiles_user_role`, the owner-only policy subquery:

```sql
business_id IN (
  SELECT business_id FROM staff_profiles
  WHERE user_id = auth.uid() AND role = 'owner'
)
```

Would perform a sequential scan on `staff_profiles` for EVERY row of the queried table. For a table with 100,000 rows, this is 100,000 sequential scans of `staff_profiles`.

---

## RLS Emergency Recovery Runbook

> Goal: Restore production access in under 5 minutes.

### Step 1: Identify the Blocked System

Check which system is locked out:
- **Founder routes** → disable RLS on `businesses`, `staff_profiles`, `profiles`
- **Settings** → disable RLS on `businesses`, `services`
- **Operations** → disable RLS on `customers`, `appointments`, `conversations`
- **Chat** → disable RLS on `messages`, `conversations`, `customers`
- **Notifications** → disable RLS on `notifications`
- **All systems locked** → proceed to full disable

### Step 2: Disable RLS for One Table

```sql
-- Replace <table_name> with the affected table
ALTER TABLE <table_name> DISABLE ROW LEVEL SECURITY;
```

Verification:
```sql
-- Should return false
SELECT relrowsecurity FROM pg_class WHERE relname = '<table_name>';
```

### Step 3: Disable RLS for Multiple Tables

```sql
-- Disable all tenant tables at once
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE escalations DISABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups DISABLE ROW LEVEL SECURITY;
ALTER TABLE voice_calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_lifecycle_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE availability_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE availability_overrides DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
-- System tables
ALTER TABLE staff_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

### Step 4: Verify Access Restored

```sql
-- Check which tables still have RLS
SELECT relname, relrowsecurity
FROM pg_class
WHERE relrowsecurity = true
  AND relkind = 'r'
  AND relnamespace = 'public'::regnamespace;
-- Should return 0 rows
```

Test each blocked endpoint:
```bash
# Test founder
curl -H "Authorization: Bearer $SUPER_ADMIN_JWT" https://frontdeskos.onrender.com/api/ops/overview

# Test settings
curl -H "x-api-key: $API_KEY" -H "Authorization: Bearer $OWNER_JWT" https://frontdeskos.onrender.com/api/settings/business?businessId=$BIZ_ID

# Test chat
curl -X POST https://frontdeskos.onrender.com/api/chat -H "Content-Type: application/json" -d '{"businessId":"...","channelType":"web_chat","channelIdentity":"test","content":"hello"}'

# Test health
curl https://frontdeskos.onrender.com/health
```

### Step 5: Rollback Order

If RLS was phased in, disable in the reverse order of enablement:

| Priority | Phase | Tables |
|----------|-------|--------|
| 1 (highest) | Phase 3 | `messages`, `customer_lifecycle_events`, `appointments`, `voice_calls`, `follow_ups`, `calendar_credentials` |
| 2 | Phase 2 | `businesses`, `notifications`, `customers`, `customer_sessions`, `customer_channels`, `escalations`, `conversations` |
| 3 | Phase 1 | `services`, `knowledge_requests`, `availability_schedules`, `availability_overrides` |
| 4 | System | `staff_profiles`, `profiles` |

### Step 6: Root Cause Analysis

After restoring access:
1. Check PostgreSQL logs for policy violations:
   ```sql
   SELECT * FROM pg_stat_statements WHERE query LIKE '%policy%' ORDER BY total_time DESC LIMIT 10;
   ```
2. Identify which policy was too restrictive
3. Fix the policy
4. Re-enable RLS on the problematic table only
5. Test before re-enabling on other tables

---

## Authorization Verification Matrix

Test every role against every route group.

### Role Setup

| Role | Has `staff_profiles` row? | `role` in staff_profiles | `status` in staff_profiles | `global_role` in profiles |
|------|---------------------------|--------------------------|---------------------------|--------------------------|
| **SUPER_ADMIN** | No (or irrelevant) | N/A | N/A | `SUPER_ADMIN` |
| **Owner** | Yes | `owner` | `active` | `USER` |
| **Staff** | Yes | `staff` | `active` | `USER` |
| **Disabled Staff** | Yes | `staff` | `suspended` | `USER` |
| **No Membership** | No | N/A | N/A | `USER` |

### Expected Results Under RLS

| Role | Route Group | Auth Source | Expected Result | Why |
|------|-------------|-------------|----------------|------|
| **SUPER_ADMIN** | Founder (`/api/ops/*`) | User JWT | ✅ **Allowed** — `requireSuperAdmin` middleware + `authenticate` passes | SUPER_ADMIN bypass in policies covers all tables |
| **SUPER_ADMIN** | Settings read | User JWT | ✅ **Allowed** — membership check passes or bypassed | `loadMembership` returns null, but SUPER_ADMIN policy bypass allows access |
| **SUPER_ADMIN** | Settings write | User JWT | ✅ **Allowed** | `requireOwner()` middleware checks `req.membership.role` — if null, `requireRole` falls back to SUPER_ADMIN check |
| **SUPER_ADMIN** | Team read | User JWT | ✅ **Allowed** | Same pattern |
| **SUPER_ADMIN** | Team write | User JWT | ✅ **Allowed** | Same pattern |
| **SUPER_ADMIN** | Operations read | User JWT | ✅ **Allowed** | `requireStaff()` fallback to SUPER_ADMIN |
| **SUPER_ADMIN** | Operations write | User JWT | ✅ **Allowed** | Same pattern |
| **SUPER_ADMIN** | Analytics | User JWT | ✅ **Allowed** | Same |
| **SUPER_ADMIN** | Notifications | User JWT | ✅ **Allowed** | Same |
| **SUPER_ADMIN** | Booking (admin) | API key | ⚠️ **Depends** — API key auth, not user JWT | No `auth.uid()` context. Would need additional policy or service-role. |
| **SUPER_ADMIN** | Public routes | None | ❌ **Blocked** — no auth at all | RLS with `auth.uid()` returns NULL. Would need public-read policies. |
| **Owner** | Founder | User JWT | ❌ **Blocked by middleware** | `requireSuperAdmin` checks `profiles.global_role != 'SUPER_ADMIN'` |
| **Owner** | Settings read | User JWT | ✅ **Allowed** — `loadMembership` returns owner | RLS allows SELECT where `business_id` matches |
| **Owner** | Settings write | User JWT | ✅ **Allowed** | RLS allows WHERE `role = 'owner'` AND `status = 'active'` |
| **Owner** | Team read | User JWT | ✅ **Allowed** | RLS allows SELECT on staff_profiles for same business |
| **Owner** | Team write (invite) | User JWT | ✅ **Allowed** | RLS INSERT policy: `role = 'owner'` |
| **Owner** | Operations read | User JWT | ✅ **Allowed** | RLS allows SELECT where `role IN ('owner', 'staff')` |
| **Owner** | Operations write | User JWT | ✅ **Allowed** | Same |
| **Owner** | Analytics | User JWT | ✅ **Allowed** | Same |
| **Owner** | Notifications | User JWT | ✅ **Allowed** | Same |
| **Staff** | Founder | User JWT | ❌ **Blocked by middleware** | `requireSuperAdmin` fails |
| **Staff** | Settings read | User JWT | ✅ **Allowed** | RLS: same business |
| **Staff** | Settings write | User JWT | ❌ **Blocked by middleware** | `requireOwner()` fails |
| **Staff** | Team read | User JWT | ✅ **Allowed** | RLS: same business |
| **Staff** | Team write | User JWT | ❌ **Blocked by middleware** | `requireOwner()` fails |
| **Staff** | Operations read | User JWT | ✅ **Allowed** | RLS: `role = 'staff'` |
| **Staff** | Operations write | User JWT | ✅ **Allowed** | Same |
| **Staff** | Analytics | User JWT | ✅ **Allowed** | Same |
| **Staff** | Notifications | User JWT | ✅ **Allowed** | Same |
| **Staff** | Booking (admin) | API key | ❌ **Blocked by middleware** | `requireApiKey` — no user JWT context |
| **Disabled Staff** | Any authenticated route | User JWT | ❌ **Blocked by middleware** | `loadMembership` returns `status: 'suspended'`. `requireStaff()` checks `req.membership.status !== 'active'` |
| **No Membership** | Founder | User JWT | ❌ **Blocked by middleware** | `requireSuperAdmin` checks profiles — fails |
| **No Membership** | Settings read | User JWT | ❌ **Blocked by middleware** | `loadMembership` returns null. RLS would also block (no `business_id` in subquery). |
| **No Membership** | Operations | User JWT | ❌ **Blocked by middleware** | `requireStaff()` checks membership — null returns 403 |
| **Anonymous** | Public website | None | ✅ **Allowed via public policy** | Must have public-read RLS policy: `FOR SELECT USING (true)` |
| **Anonymous** | Chat (public) | Session ID | ⚠️ **Depends on session policy** | RLS must allow INSERT via session_id, not `auth.uid()` |
| **Anonymous** | Booking (public) | None | ⚠️ **Depends on public policy** | Public booking endpoints must have policies for anonymous access |

### Critical Ambiguities

1. **Booking engine uses API key, not user JWT.** Under RLS, `auth.uid()` returns NULL. The booking controller must either use service-role (bypass) or the booking endpoint must migrate to user JWT auth.

2. **Public chat has no auth.** The AI Receptionist creates customers and conversations without any authenticated user. RLS policies must include an alternative path: `current_setting('app.session_id') IN (SELECT session_id FROM customer_sessions WHERE business_id = ...)`.

3. **`loadMembership` returns only one business.** If a user has multiple staff_profiles rows (e.g., staff at two businesses), only the first row is returned. RLS policies would correctly use `auth.uid() IN (SELECT business_id FROM staff_profiles WHERE user_id = auth.uid())` which returns ALL businesses, not just one. This creates a mismatch: middleware allows access to only one business, but RLS allows access to all businesses the user belongs to. The middleware is more restrictive, so RLS would not be the problem — but it means the middleware's `LIMIT 1` is a latent bug that would surface if middleware checks are relaxed in the future.

---

## Security Risk Review

### Final Review Questions

#### 1. Which table is most dangerous to enable RLS on first?

**`staff_profiles`**

Enabling RLS on `staff_profiles` without a SUPER_ADMIN bypass would:
- Prevent onboarding from creating owner accounts
- Prevent founder routes from assigning/transferring ownership
- Prevent team management from inviting staff

The entire tenant provisioning system depends on unconstrained INSERT/DELETE on `staff_profiles`. This table must have either a service-role escape hatch or a SUPER_ADMIN policy bypass. Even with a bypass, the existing RLS on `staff_profiles` only covers SELECT — enabling full RLS without testing every ownership path will break tenant creation.

**Second most dangerous: `businesses`.** The onboarding flow creates businesses, and the founder OS reads all businesses across tenants. If RLS blocks `SELECT * FROM businesses` without a `business_id` filter, the founder overview aggregates (total business count, recent businesses) would return empty.

#### 2. Which workflow is most likely to break?

**The onboarding → createOwner pipeline.**

This workflow spans two auth contexts:
1. The SUPER_ADMIN's JWT (for the API call)
2. The service role key (for `supabase.auth.admin.createUser()`)
3. A direct pool INSERT into `staff_profiles` (which needs to bypass RLS)

If `staff_profiles` has RLS without service-role escape, step 3 fails. The new auth user is created in Supabase Auth, the business exists, but no owner profile is created. The tenant is orphaned — a business with no active owner.

#### 3. Which route currently depends on service-role behavior?

| Route | File | Service Role Usage |
|-------|------|--------------------|
| `POST /api/ops/businesses/:id/assign-owner` | `founder.controller.ts:assignOwner` | `supabase.auth.admin.createUser()` |
| `POST /api/ops/users/:id/reset-password` | `founder.controller.ts:resetUserPassword` | `supabase.auth.admin.generateLink()` |
| `POST /api/ops/users/:id/transfer-ownership` | `founder.controller.ts:transferOwnership` | Direct pool transaction (benefits from bypass) |
| `POST /onboarding/owner` | `onboarding.controller.ts:createOwner` | `supabase.auth.admin.createUser()` |
| `POST /team/invite` | `team.controller.ts` | `supabase.auth.admin.createUser()` |

All routes that create auth users depend on the service role. The service role is not going away — but its database access (via `createClient`) is separate from the pool queries. Under RLS, the `createClient` connections with service role would bypass RLS (correctly), while the `pool.query()` calls in the same handler would be subject to RLS (problematic).

#### 4. Which subsystem would become inaccessible if policies are wrong?

**Founder OS.** If RLS on `businesses`, `staff_profiles`, or `profiles` blocks SUPER_ADMIN access, the entire founder panel goes blank:
- `GET /api/ops/overview` — aggregate queries return 0 for all metrics
- `GET /api/ops/businesses` — returns empty array
- `GET /api/ops/users` — returns empty array
- `GET /api/ops/onboarding` — returns empty array

The founder OS is the canary in the coal mine. If it works, most other systems will work. If it breaks, the fix requires immediate RLS disable on 3+ tables.

#### 5. Which phase should be considered the highest risk?

**Phase 2: Core Tenant Tables.**

Specifically, enabling RLS on `customers` (table 7 in Phase 2). This table has:
- The most code paths (chat, booking, operations, analytics, notifications)
- PII data that must be protected
- Multiple queries that lack `business_id` filtering in repositories
- The highest impact if a policy is wrong

Phase 3 (`messages`, `appointments`) is also high risk, but those tables are reached through `customers` and `conversations`, so Phase 2 errors would be discovered before Phase 3.

### Explicit Recommendations

1. **Do not enable RLS on any table until the architectural blocker is resolved.** The `pg.Pool` connects as `postgres` superuser — RLS has zero effect. Create an `app_user` role first.

2. **Onboarding and founder operations must run under service-role or via SECURITY DEFINER functions.** These workflows create tenants and assign ownership — they inherently operate outside the tenant isolation model.

3. **Add EVERY missing index in Phase 0.** Without indexes on `staff_profiles.business_id`, `staff_profiles.user_id + role`, and `profiles.global_role`, policy subqueries will be slow.

4. **Test `staff_profiles` RLS last, despite being a system table.** It has the most complex access patterns (self-read, same-business-read, insert-by-owner, insert-by-SUPER_ADMIN, delete-by-owner, transaction-based ownership transfer).

5. **The public chat endpoint needs a session-based RLS escape hatch.** Without it, the AI Receptionist cannot create customers, conversations, or messages under RLS.

6. **Write a `NOT_APPROVED` status on this document until Phase 0 (architectural blocker) is resolved.**

---

## Scorecard

| Metric | Score (1-10) | Notes |
|--------|-------------|-------|
| **Risk Score** | **9/10** | Higher = more risk. RLS in current architecture has NO EFFECT. Onboarding WILL break. Founder OS WILL break without SUPER_ADMIN bypass. |
| **RLS Readiness** | **2/10** | Lower = less ready. Schema anomalies, missing columns, missing indexes, architectural blocker (pg.Pool as superuser), no session-based auth for chat. |
| **Policy Design Soundness** | **7/10** | The proposed policies are well-structured. The issue is not the design — it's the inability to enforce them. |
| **Rollout Safety** | **3/10** | No safety net. If RLS is enabled without the app_user role change, it appears to work (no errors) but provides zero protection. False sense of security. |

### Recommendation: **NOT APPROVED FOR IMPLEMENTATION**

**Required actions before Phase 0 can begin:**

| # | Action | Owner | Effort |
|---|--------|-------|--------|
| 1 | Create `app_user` PostgreSQL role (non-superuser, limited privileges) | Backend | 1 day |
| 2 | Add new `APP_POOL_DATABASE_URL` to config (connects as `app_user`) | Backend | 0.5 day |
| 3 | Create middleware to `SET LOCAL role = 'app_user'` and set `request.jwt.claim.sub` | Backend | 0.5 day |
| 4 | Migrate all repositories to use `app_user` pool | Backend | 1 day |
| 5 | Resolve `messages.business_id` and `customer_lifecycle_events.changed_by` schema gaps | DB Migration | 0.5 day |
| 6 | Add all missing indexes from the Required Security Indexes table | DB Migration | 0.5 day |
| 7 | Verify `auth.uid()` returns correct value after middleware change | Test | 0.5 day |
| 8 | Verify RLS policies actually block unauthorized access | Test | 1 day |
| 9 | **Re-run this entire audit** after changes are deployed | Review | 1 day |

**Estimated total effort before Phase 0: 6-7 engineering days.**

Do not proceed until the `app_user` role is created and `auth.uid()` returns the correct value on pool connections.

---

## Recommended First Migration

### Migration 000 — Schema Alignment

No RLS yet. Fix missing columns:

1. `ALTER TABLE messages ADD COLUMN business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE;`
2. Backfill from conversations table
3. `ALTER TABLE customer_lifecycle_events ADD COLUMN changed_by UUID REFERENCES auth.users(id);`
4. Backfill lifecycle events
5. Create `auth.is_super_admin()` helper function

### Migration 001 — Phase 1 (RLS)

Enable RLS on `services`, `knowledge_requests`, `availability_schedules`, `availability_overrides` with standard tenant + SUPER_ADMIN policies.

---

*Design complete. Ready for review before implementation.*
