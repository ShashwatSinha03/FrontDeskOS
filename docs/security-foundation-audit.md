# FrontDeskOS — Security Foundation Architecture Audit

> **Status:** Pre-Implementation Architecture Plan
>
> Do NOT create PostgreSQL roles.
> Do NOT modify database connections.
> Do NOT implement anything.
>
> This document is the *architectural blueprint* for making RLS enforceable.
> It must be approved before any code or database changes begin.

---

## Table of Contents

1. [Current Architecture](#1-current-architecture)
2. [Identity Gap Analysis](#2-identity-gap-analysis)
3. [Complete Access Manifest](#3-complete-access-manifest)
4. [Architecture Options](#4-architecture-options)
5. [Recommended Architecture](#5-recommended-architecture)
6. [Implementation Phases](#6-implementation-phases)
7. [File Change Map](#7-file-change-map)
8. [Rollback Strategy](#8-rollback-strategy)
9. [Risks](#9-risks)
10. [Decision](#10-decision)

---

## 1. Current Architecture

### Request Lifecycle

```
HTTP Request
    │
    ▼
Express Router
    │
    ▼
Middleware Stack
    ├── authenticate()         ← sets req.user (Supabase User object)
    ├── resolveSession()       ← sets req.sessionId (string)
    ├── loadMembership()       ← sets req.membership (single business)
    ├── requireStaff/Owner()   ← checks req.membership.role
    ├── requireSuperAdmin()    ← checks profiles.global_role
    └── requireApiKey()        ← checks x-api-key header
    │
    ▼
Controller / Service
    │
    ├── Repository (pool.query)    ← 68 calls across 12 files
    ├── Direct pool.query()        ← 67 calls across 20 files
    └── createClient(service_role) ← 5 calls across 4 files (auth admin)
    │
    ▼
pg.Pool (single, shared)
    │
    ▼
PostgreSQL (connected as postgres superuser)
```

### Key Observation

Every arrow in this chain is a **trust boundary crossing**, but only the `authenticate()` middleware at the top actually verifies identity. Everything below `authenticate()` operates on trust — the `req.user` object is passed along, but **no identity information reaches PostgreSQL**.

### Connection Details

| Property | Value |
|----------|-------|
| Driver | `pg.Pool` (node-postgres) |
| Connection string | `config.DATABASE_URL` |
| Database role | `postgres` (superuser) |
| SSL | RejectUnauthorized: false (production) |
| Connection timeout | 10,000ms |
| Idle timeout | 30,000ms |
| Max connections | Default (10) |
| Row level security | **Bypassed** (superuser has `bypassrls`) |
| `auth.uid()` value | **NULL** (no JWT context on pool connections) |

---

## 2. Identity Gap Analysis

### Where Identity Is Lost

| Step | What Happens | Identity Present? |
|------|-------------|-------------------|
| 1. HTTP Request arrives | Headers contain Bearer JWT + API key | ✅ In headers |
| 2. `authenticate()` middleware | Verifies JWT via Supabase `auth.getUser()`. Sets `req.user`. | ✅ `req.user` populated |
| 3. `loadMembership()` middleware | Queries staff_profiles. Sets `req.membership`. | ✅ `req.user.id` used |
| 4. Controller/repository method | Calls `pool.query('SELECT ...', [params])` | ❌ **No identity passed to PG** |
| 5. `pg.Pool` connects to PG | Opens connection as `postgres` superuser | ❌ `auth.uid()` = NULL |
| 6. PostgreSQL evaluates query | RLS is **bypassed** (superuser) | ❌ Policy never runs |

### The Three Gaps

#### Gap 1: No Connection-Level Identity

The `pg.Pool` connection has no concept of which user is making the request. PostgreSQL supports `SET LOCAL` session variables that can be read by RLS policies via `current_setting()`, but nothing in the current middleware stack sets these.

#### Gap 2: Superuser Bypass

Even if identity were set, it wouldn't matter — the `postgres` superuser role has `bypassrls = true`. PostgreSQL RLS policies are **never evaluated** for superuser connections.

#### Gap 3: Auth Context Is Shallow

`authenticate()` calls `supabase.auth.getUser()` which uses the Supabase JS client. This client has its own HTTP connection to Supabase Auth. The result (`req.user`) is a plain object — there's no persistent Supabase session or authenticated client that could be used for `supabase.from()` queries.

### Consequences

| If someone writes... | The current system... | What RLS should do |
|---------------------|----------------------|--------------------|
| `SELECT * FROM customers` | Returns all customers across all businesses | ❌ Not prevented |
| `UPDATE businesses SET name = 'hacked'` | Succeeds if caller knows business ID | ❌ Not prevented |
| `DELETE FROM staff_profiles` | Succeeds if caller has DB access | ❌ Not prevented |
| `INSERT INTO appointments` | Succeeds without ownership check | ❌ Not prevented |

All tenant isolation depends entirely on every developer remembering to add `WHERE business_id = $N` to every query. 135 `pool.query()` calls — a single omission exposes all tenants.

---

## 3. Complete Access Manifest

### Layer 1: Database Configuration

| File | Role |
|------|------|
| `backend/src/config/db.ts` | Creates single `pg.Pool` from `DATABASE_URL` |
| `backend/src/config/index.ts` | Validates `DATABASE_URL`, `SUPABASE_URL`, keys via Zod |

### Layer 2: Connection Pool Users (34 files)

| Group | Files | `pool.*` Calls | Direct `pool.query`? |
|-------|-------|----------------|---------------------|
| **Repositories (12)** | `.repository.ts` in `repositories/` | 68 | 68 (all via repo methods) |
| **Controllers (10)** | `.controller.ts` in `controllers/` | 65 | 65 **(no repo abstraction)** |
| **Services (5)** | `chat.service.ts`, `appointment.service.ts`, `recovery.service.ts`, `missed-call.handler.ts`, `abandonment-detector.ts` | 5 | 5 **(no repo abstraction)** |
| **Middleware (4)** | `load-membership.ts`, `require-role.ts`, `require-super-admin.ts`, `require-business-access.ts` | 4 | 4 |
| **Workflows (1)** | `agent.nodes.ts` | 2 | 2 |
| **Routes (1)** | `me.routes.ts` (inline queries) | 1 | 1 |
| **Tests (1)** | `integration.int.test.ts` | 3 | 2 |

### Layer 3: Supabase Client Users (4 files)

| File | Key Used | Purpose |
|------|----------|---------|
| `middleware/authenticate.ts` | `SUPABASE_ANON_KEY` | Verify Bearer token, get user |
| `controllers/onboarding.controller.ts` | `SUPABASE_SERVICE_ROLE_KEY` | Create auth user during owner setup |
| `controllers/team.controller.ts` | `SUPABASE_SERVICE_ROLE_KEY` | Create auth user during staff invite |
| `controllers/founder.controller.ts` | `SUPABASE_SERVICE_ROLE_KEY` | Create auth user, generate password reset |

### Layer 4: Anonymous / Unauthenticated Paths

| Path | Auth | DB Access | Creates Records? |
|------|------|-----------|-----------------|
| `POST /api/chat` | Session ID (header/body) | Repos: customer, session, conversation | Yes — creates customers, conversations, messages |
| `GET /api/public/businesses/:slug` | None (public) | Repos: business, services | No |
| `GET /api/public/businesses/:slug/services` | None (public) | Direct pool.query | No |
| `POST /api/public/businesses/:slug/contact` | None (public) | Repos: customer, conversation | Yes — creates customer, conversation, message |
| `POST /api/public/sessions/create` | None (public) | Repos: session | Yes — creates session |
| `GET /api/appointments/slots` | None (public) | `appointmentService` | No |
| `POST /api/appointments/book` | None (public) | `appointmentService` + repos | Yes — creates appointment, potentially customer |

### Layer 5: Background Jobs (No HTTP Context)

| Job | Schedule | DB Access | Creates Records? |
|-----|----------|-----------|-----------------|
| Recovery scheduler | Every 30s | `recovery.service.ts` + repos | Yes — generates messages |
| Abandonment detector | Every 30s | `abandonment-detector.ts` + repos | Yes — triggers escalations, follow-ups |
| Missed call handler | Event-driven | `missed-call.handler.ts` | Yes — creates follow-ups |
| Follow-up scheduler | Every 60s | `followUpRepository` | Yes — marks follow-ups as sent |

---

## 4. Architecture Options

### Option A: SET LOCAL Session Variables + Wrapper Pool

**Concept:** Create a thin wrapper around `pg.Pool` that automatically executes `SET LOCAL` for every connection checkout, and create middleware that stores identity in `async_hooks` / `AsyncLocalStorage`.

**How it works:**
```
Request → Middleware stores { user_id, business_id, role } in AsyncLocalStorage
       → For each pool.query(), wrapper prepends:
           SET LOCAL "app.user_id" = '...';
           SET LOCAL "app.business_id" = '...';
           SET LOCAL "app.role" = '...';
         (using same client for the transaction scope)
```

**RLS policies read:**
```sql
current_setting('app.user_id', true)
```

**Pros:**
- Minimal changes to repositories (swap `pool` import for `appPool`)
- Works with existing raw SQL queries (no ORM migration)
- AsyncLocalStorage is standard Node.js (no additional dependencies)
- Can be layered — add variables one at a time

**Cons:**
- Each query pays a small overhead for `SET LOCAL`
- Need to handle transaction-scoped connections carefully
- `SET LOCAL` only applies until the end of the transaction or session
- AsyncLocalStorage can leak if middleware doesn't clean up

**Migration effort:** Small (add wrapper, swap imports, add middleware)

---

### Option B: Supabase PostgREST / JWT-Aware Client

**Concept:** Replace all `pool.query()` calls with `supabase.from()` calls using a Supabase client initialized with the user's JWT. The Supabase client automatically sends the JWT as `Authorization: Bearer` header to PostgREST, which sets `request.jwt.claim.sub` and evaluates RLS.

**How it works:**
```ts
// Instead of:
const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);

// Use:
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${req.user.jwt}` } }
});
const { data } = await supabase.from('customers').select('*').eq('id', id);
```

**Pros:**
- JWT context is automatically propagated
- RLS works natively (PostgREST handles `auth.uid()`)
- Type-safe if using Supabase types
- No connection pool management needed

**Cons:**
- **Massive refactor** — all 135 `pool.query()` calls must be rewritten
- PostgREST has different SQL capabilities (no CTEs, limited JOINs, no transactions in REST)
- Currently uses `ON DELETE CASCADE` FKs and multi-table transactions — difficult to express in REST
- Performance overhead of HTTP calls vs direct connection
- Supabase client is designed for frontend, not backend internal use
- Scheduler jobs have no JWT to pass

**Migration effort:** Very large (rewrite all repositories, all controllers, all services)

---

### Option C: Dedicated app_user Role + New Pool

**Concept:** Create a new PostgreSQL role (`app_user`) that is NOT a superuser, has limited schema permissions, and is used for all application queries. Create a second pool (next to the existing superuser pool) that connects as `app_user`. Add middleware that executes `SET SESSION AUTHORIZATION` or `SET ROLE app_user` and sets JWT claims via `SET LOCAL`.

**How it works:**
```
Two pools:
  appPool → connects as app_user (for all tenant queries)
             RLS is enforced (app_user has bypassrls = false)

  adminPool → connects as postgres (for migrations, scheduler, onboarding)
              RLS is bypassed (intentional — for system operations)
```

**Pros:**
- Clear separation: tenant queries vs system operations
- RLS is actually enforced
- `auth.uid()` works if `request.jwt.claim.sub` is set
- Minimal perf overhead (one `SET` per connection checkout)
- Scheduler jobs use adminPool (no identity needed)

**Cons:**
- More complex pool management
- Must never accidentally use adminPool for tenant queries
- Need to grant precise permissions to `app_user` (risk of over-granting)

**Migration effort:** Medium (new pool, middleware changes, repo import swaps, permission grants)

---

### Option D: Hybrid — app_user Pool + SET LOCAL in Middleware

**Concept:** Combine Options A and C:
1. Create `app_user` role with limited privileges
2. Create two pools: `appPool` (app_user) and `adminPool` (postgres)
3. Add middleware that stores user identity in AsyncLocalStorage
4. Wrap `appPool` to automatically set session variables on connection checkout
5. Controllers and services that bypass repositories are migrated to use either `appPool` or repositories

**How it works:**
```
Request with JWT
  → authenticate() verifies JWT, sets req.user
  → identityContext middleware:
       stores { userId, businessId, role, globalRole } in AsyncLocalStorage
  → controller/service calls repository
  → repository calls appPool.query(sql, params)
  → appPool wraps: SET LOCAL "app.user_id" = '...'; SET LOCAL "app.role" = '...';
  → PostgreSQL evaluates with app_user role → RLS enforced
```

**This is the recommended approach** (detailed in Section 5).

---

### Comparison Matrix

| Criteria | Option A (SET LOCAL) | Option B (PostgREST) | Option C (app_user Pool) | Option D (Hybrid) |
|----------|---------------------|---------------------|------------------------|-------------------|
| RLS enforceability | ✅ Works with app_user | ✅ Native | ✅ Bypassrls=false | ✅ Bypassrls=false |
| `auth.uid()` works | ✅ Via `current_setting()` | ✅ Native (PostgREST) | ✅ Via `request.jwt.claim.sub` | ✅ Via `request.jwt.claim.sub` |
| Migration effort | **Small** | **Very large** | **Medium** | **Medium** |
| Refactoring needed | Import swaps only | Rewrite all queries | Import swaps + new pool | Import swaps + new pool |
| Scheduler support | ⚠️ Needs adminPool | ❌ No JWT available | ✅ Has adminPool | ✅ Has adminPool |
| Anonymous chat support | ⚠️ Needs session ID variant | ❌ No JWT | ⚠️ Needs session ID variant | ⚠️ Needs session ID variant |
| Transaction support | ✅ Native | ❌ HTTP limitation | ✅ Native | ✅ Native |
| Performance overhead | Negligible | Significant (HTTP) | Negligible | Negligible |
| Future-proof | ✅ | ❌ (Vendor lock) | ✅ | ✅ |

---

## 5. Recommended Architecture

### Architecture Diagram

```
                         ┌─────────────────────────────────┐
                         │          Express App             │
                         │                                  │
                         │  ┌───────────────────────────┐   │
                         │  │   authenticate()          │   │
                         │  │   ↓ req.user              │   │
                         │  │   loadMembership()         │   │
                         │  │   ↓ req.membership         │   │
                         │  └───────────────────────────┘   │
                         │              │                   │
                         │              ▼                   │
                         │  ┌───────────────────────────┐   │
                         │  │ identityContext()          │   │
                         │  │ Stores in AsyncLocalStorage │   │
                         │  │   app.userId               │   │
                         │  │   app.businessId           │   │
                         │  │   app.role                 │   │
                         │  │   app.globalRole           │   │
                         │  └───────────────────────────┘   │
                         │              │                   │
                         │     ┌────────┴────────┐          │
                         │     ▼                 ▼          │
                         │  App Pool        Admin Pool      │
                         │  (app_user)      (postgres)      │
                         │     │                 │          │
                         │     ▼                 ▼          │
                         │  SET LOCAL on      Bypasses      │
                         │  checkout          RLS           │
                         │     │                 │          │
                         └─────┼─────────────────┼──────────┘
                               │                 │
                    ┌──────────┘                 └──────────┐
                    ▼                                        ▼
          ┌─────────────────┐                    ┌─────────────────┐
          │   PostgreSQL    │                    │  Supabase Auth  │
          │   (app_user)    │                    │  (service_role) │
          │   RLS enforced  │                    │  Auth admin ops │
          └─────────────────┘                    └─────────────────┘
```

### Component Details

#### 5.1 PostgreSQL Role: `app_user`

```sql
CREATE ROLE app_user WITH LOGIN NOINHERIT;
ALTER ROLE app_user SET bypassrls = false;  -- explicit
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- app_user cannot read auth.users or auth.schema
-- app_user cannot create migrations
-- app_user cannot read pg_settings (except session-level)
```

**Permissions philosophy:** Grant the minimum set. `app_user` does NOT need:
- `CREATE` on schema (migrations are separate)
- `DROP` on any table
- Access to `auth` schema (Supabase internal)
- `pg_read_all_settings` or `pg_read_all_stats`

#### 5.2 Connection Pools

```typescript
// backend/src/config/db.ts — Refactored

// Pool for tenant queries — RLS enforced
const appPool = new Pool({
  connectionString: config.APP_DATABASE_URL,     // connects as app_user
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  // On every connection checkout, set session variables
  // (This is pseudo-code — actual implementation via pg.Pool event handlers)
});

// Pool for system operations — bypasses RLS intentionally
const adminPool = new Pool({
  connectionString: config.DATABASE_URL,           // connects as postgres
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 5,  // smaller pool — only for system ops
});
```

**Key design rule:** `appPool` is the default. `adminPool` is explicitly imported only by system-level code (onboarding, founder, scheduler, migrations).

#### 5.3 Identity Context Middleware

```
Location: backend/src/middleware/identity-context.ts
Runs after: authenticate(), loadMembership()
Runs before: all controllers and services
```

**Logic:**
1. Read `req.user?.id`, `req.membership?.businessId`, `req.membership?.role`
2. If SUPER_ADMIN (no membership): query `profiles.global_role`
3. Store in AsyncLocalStorage: `{ userId, businessId, role, globalRole }`
4. On response finish: clean up AsyncLocalStorage

#### 5.4 Pool Wrapper / Client Extension

The `appPool` needs to automatically set session variables before each query. Two implementation options:

**Option 1: Event-based (recommended)**
```typescript
appPool.on('connect', (client) => {
  // On each new connection, execute SET for identity context
  // This is the default context for queries without explicit identity
});

// Additionally, for each query:
const originalQuery = appPool.query.bind(appPool);
appPool.query = (text, params) => {
  const ctx = identityContext.getStore();
  if (ctx) {
    // Prepend SET LOCAL statements using same client
    // (Requires access to underlying client — needs careful implementation)
  }
  return originalQuery(text, params);
};
```

**Option 2: Decorator pattern (cleaner)**
Create a wrapper function:
```typescript
export function withIdentity<T>(queryFn: () => Promise<T>): Promise<T> {
  const ctx = identityContext.getStore();
  if (!ctx) return queryFn();
  return appPool.connect(async (client) => {
    await client.query(`SET LOCAL "app.user_id" = '${ctx.userId}'`);
    await client.query(`SET LOCAL "app.business_id" = '${ctx.businessId}'`);
    await client.query(`SET LOCAL "app.role" = '${ctx.role}'`);
    await client.query(`SET LOCAL "app.global_role" = '${ctx.globalRole}'`);
    return queryFn();
  });
}
```

**Security note:** The `SET LOCAL` values should use parameterized queries to prevent SQL injection:
```sql
SELECT set_config('app.user_id', $1, true)
```
Not string interpolation.

#### 5.5 Session Variable Payload

| Variable | Source | NULL for anonymous? | Used in which policies? |
|----------|--------|-------------------|----------------------|
| `app.user_id` | `req.user.id` | Yes (NULL for unauthenticated) | All tenant SELECT/INSERT/UPDATE |
| `app.business_id` | `req.membership.businessId` | Yes | Tenant business_id filter |
| `app.role` | `req.membership.role` | Yes | Owner-only operations |
| `app.global_role` | `profiles.global_role` | No — defaults to `USER` | SUPER_ADMIN bypass |
| `app.session_id` | `req.sessionId` | Yes | Anonymous chat operations |

#### 5.6 Anonymous / Session-Based Path

For the AI Receptionist and public booking paths (which have no authenticated user):

```
Request without JWT
  → resolveSession() sets req.sessionId
  → identityContext() stores:
       app.user_id = NULL
       app.business_id = NULL
       app.session_id = 'abc-123'
  → Public controller / chat service queries via appPool
  → RLS policies check:
       COALESCE(current_setting('app.user_id', true), '') != ''
       OR current_setting('app.session_id', true) IN (
         SELECT session_id FROM customer_sessions
         WHERE business_id = <extracted from query>
       )
```

This means **every anonymous RLS policy must include a session-based OR clause**. This is more complex than user-based policies, but it's the only way to protect data while allowing unauthenticated access.

#### 5.7 Scheduler / Background Job Path

Background jobs have no HTTP context:

```
Scheduler trigger
  → No middleware stack
  → Uses adminPool (bypasses RLS, intentional)
  → Queries cross-tenant data (findActiveByInactivity, findDueToProcess)
  → Writes are done carefully — system-level operations only
```

**Governance rule:** Any code using `adminPool` must be explicitly reviewed and tagged. A simple convention:
```typescript
import { adminPool } from '../config/db';  // // eslint-disable-line restrict-imports
```

#### 5.8 SUPABASE_SERVICE_ROLE_KEY Path

For operations that create auth users (onboarding, team invite, founder):

```
Controller calls supabase.auth.admin.createUser()
  → Uses createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  → THIS IS SEPARATE from the database pools
  → It connects to Supabase Auth API, not directly to PostgreSQL
  → Unaffected by RLS (correctly — auth admin is a different concern)
```

**No change needed** for this path. The service role key is used for Supabase Auth operations, not for direct database queries.

---

## 6. Implementation Phases

### Phase 0 — Foundation (2-3 days)

**Goal:** Create the `app_user` role, pools, middleware, and verify RLS can be enforced.

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 0.1 | Create `app_user` PostgreSQL role | Migration (SQL) | 0.5 day |
| 0.2 | Grant permissions to `app_user` on all existing tables | Migration (SQL) | 0.5 day |
| 0.3 | Add `APP_DATABASE_URL` to config/index.ts (Zod validation) | `config/index.ts` | 0.25 day |
| 0.4 | Create `appPool` and `adminPool` in db.ts | `config/db.ts` | 0.5 day |
| 0.5 | Implement `identity-context.ts` middleware | NEW: `middleware/identity-context.ts` | 0.5 day |
| 0.6 | Implement AsyncLocalStorage identity store | NEW: `utils/identity-store.ts` | 0.25 day |
| 0.7 | Wire identity middleware into app.ts | `app.ts` | 0.25 day |

**Verification:** Start server, hit an authenticated route, check PostgreSQL logs for session variables:
```sql
SELECT current_setting('app.user_id', true);
SELECT current_setting('app.business_id', true);
```

**Rollback:** Remove `identity-context.ts` from middleware stack, revert to single pool.

### Phase 1 — Repository Migration (1-2 days)

**Goal:** Migrate all 12 repositories to use `appPool` instead of the legacy `pool`.

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 1.0 | Export `appPool` as `pool` from db.ts (backward compatibility) | `config/db.ts` | 0.1 day |
| 1.1 | Verify all repositories only call `pool.query()`, not `pool.connect()` | 12 repo files | 0.5 day |
| 1.2 | Migrate `pool.connect()` transaction calls to use `appPool` | `customer.repository.ts`, `onboarding.repository.ts` | 0.25 day |
| 1.3 | Add identity context propagation to `pool.connect()` transaction blocks | Same 2 files | 0.25 day |
| 1.4 | Verify repositories still work with `app_user` permissions | All 12 repos | 0.5 day |

**No file changes needed for repositories** — if `appPool` is exported as `pool`, existing imports work unchanged. The key change is in `db.ts`.

**Verification:** Full integration test pass with `appPool`.

**Rollback:** Revert `db.ts` to export legacy pool only.

### Phase 2 — Controller Migration (2-3 days)

**Goal:** Migrate 10 controllers that bypass repositories (65 queries) to either use repositories or use `appPool` with identity context.

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 2.1 | Audit each controller's direct `pool.query()` calls | 10 controllers | 0.5 day |
| 2.2 | Move reusable queries into repositories (reduce duplication) | Controllers + repositories | 1 day |
| 2.3 | Replace remaining direct queries with `appPool` with identity wrapper | Controllers | 1 day |
| 2.4 | Verify all controller queries now use `appPool` | All 10 controllers | 0.5 day |

**Target controller changes:**

| Controller | Direct pool queries | Action |
|------------|-------------------|--------|
| `founder.controller.ts` | 21 | Move aggregate queries to `adminPool` (founder uses SUPER_ADMIN, bypasses RLS intentionally) |
| `settings.controller.ts` | 6 | Move to existing repositories |
| `analytics.controller.ts` | 6 | Create `analytics.repository.ts` or use `appPool` |
| `operational.controller.ts` | 8 | Move to existing repositories |
| `team.controller.ts` | 7 | Keep admin operations on `adminPool`, move rest to repos |
| `dashboard.controller.ts` | 4 | Move to existing repositories |
| `owner.controller.ts` | Unknown | Audit and migrate |
| `public.controller.ts` | 2 | Already uses repos for business — migrate remaining |
| `onboarding.controller.ts` | 2 | Use `adminPool` (system operation) |
| `recovery.controller.ts` | 2 | Use `adminPool` (system operation) |

**Verification:** Every endpoint returns same results before and after migration.

**Rollback:** Revert controller changes, use legacy pool.

### Phase 3 — Service Migration (1 day)

**Goal:** Migrate 5 service files that bypass repositories.

| File | Direct queries | Target |
|------|---------------|--------|
| `chat.service.ts` | 1 | Move to repository |
| `appointment.service.ts` | 1 | Move to repository |
| `recovery.service.ts` | 1 | `adminPool` (system operation) |
| `missed-call.handler.ts` | 1 | `adminPool` (system operation) |
| `abandonment-detector.ts` | 1 | `adminPool` (system operation) |

**Verification:** Chat flow, booking flow, and recovery scheduler all work.

**Rollback:** Revert service changes.

### Phase 4 — Middleware Migration (0.5 day)

**Goal:** Migrate 4 middleware files that call `pool.query()` directly.

| File | Query | Target |
|------|-------|--------|
| `load-membership.ts` | `SELECT ... FROM staff_profiles WHERE user_id = $1` | `appPool` — this reads current user's profile |
| `require-role.ts` | `SELECT global_role FROM profiles WHERE id = $1` | `appPool` — same reason |
| `require-super-admin.ts` | `SELECT global_role FROM profiles WHERE id = $1` | `appPool` — same reason |
| `require-business-access.ts` | `SELECT id FROM businesses WHERE slug = $1` | `appPool` — same reason |

All four middleware queries read data that `app_user` should be able to access. They are identity-aware (use `req.user.id`).

**Verification:** All routes work with correct authorization.

**Rollback:** Revert to legacy pool.

### Phase 5 — Testing & Validation (2-3 days)

**Goal:** Verify that RLS is now enforceable and that everything still works.

| Step | Task | Effort |
|------|------|--------|
| 5.1 | Grant `app_user` limited permissions only | 0.5 day |
| 5.2 | Run full integration test suite | 0.5 day |
| 5.3 | Manually test all 11 subsystems with `app_user` | 1 day |
| 5.4 | Enable RLS on ONE table (low-risk: `services`) | 0.25 day |
| 5.5 | Verify RLS blocks unauthorized access for `services` | 0.25 day |
| 5.6 | Verify authorized access still works for `services` | 0.25 day |
| 5.7 | Write RLS policy test suite | 0.5 day |

**Rollback:** Disable RLS on `services`. Revert to postgres pool.

### Phase 6 — Enable RLS (Deferred)

This phase is covered by `docs/rls-audit.md`. Do not start until Phases 0-5 are complete and verified.

---

## 7. File Change Map

### Files That MUST Change

| # | File | Change | Phase |
|---|------|--------|-------|
| 1 | `backend/src/config/index.ts` | Add `APP_DATABASE_URL` Zod validation | 0 |
| 2 | `backend/src/config/db.ts` | Add `appPool`, `adminPool`, export both | 0 |
| 3 | `backend/src/middleware/identity-context.ts` | **NEW** — stores identity in AsyncLocalStorage | 0 |
| 4 | `backend/src/app.ts` | Add `identityContext` middleware to stack | 0 |
| 5 | `backend/src/utils/identity-store.ts` | **NEW** — AsyncLocalStorage wrapper | 0 |

### Files That SHOULD Change

| # | File | Change | Phase |
|---|------|--------|-------|
| 6 | `backend/src/repositories/*.ts` (12 files) | Ensure they use `appPool` (no code change if db.ts exports `appPool` as default) | 1 |
| 7 | `backend/src/controllers/founder.controller.ts` | 21 queries → use `adminPool` (system ops) | 2 |
| 8 | `backend/src/controllers/settings.controller.ts` | 6 queries → migrate to repositories | 2 |
| 9 | `backend/src/controllers/analytics.controller.ts` | 6 queries → create repository or use `appPool` | 2 |
| 10 | `backend/src/controllers/operational.controller.ts` | 8 queries → migrate to repositories | 2 |
| 11 | `backend/src/controllers/team.controller.ts` | 7 queries → split: auth ops on `adminPool`, rest on repos | 2 |
| 12 | `backend/src/controllers/dashboard.controller.ts` | 4 queries → migrate to repositories | 2 |
| 13 | `backend/src/controllers/owner.controller.ts` | Audit and migrate queries | 2 |
| 14 | `backend/src/controllers/public.controller.ts` | 2 queries → migrate | 2 |
| 15 | `backend/src/controllers/onboarding.controller.ts` | 2 queries → `adminPool` (system ops) | 2 |
| 16 | `backend/src/controllers/recovery.controller.ts` | 2 queries → `adminPool` (system ops) | 2 |
| 17 | `backend/src/services/chat.service.ts` | 1 query → repository | 3 |
| 18 | `backend/src/services/appointment.service.ts` | 1 query → repository | 3 |
| 19 | `backend/src/services/recovery/recovery.service.ts` | 1 query → `adminPool` | 3 |
| 20 | `backend/src/services/recovery/missed-call.handler.ts` | 1 query → `adminPool` | 3 |
| 21 | `backend/src/services/recovery/abandonment-detector.ts` | 1 query → `adminPool` | 3 |
| 22 | `backend/src/middleware/load-membership.ts` | 1 query → `appPool` | 4 |
| 23 | `backend/src/middleware/require-role.ts` | 1 query → `appPool` | 4 |
| 24 | `backend/src/middleware/require-super-admin.ts` | 1 query → `appPool` | 4 |
| 25 | `backend/src/middleware/require-business-access.ts` | 1 query → `appPool` | 4 |
| 26 | `backend/src/workflows/agent.nodes.ts` | 2 queries → `appPool` | 4 |
| 27 | `backend/src/routes/me.routes.ts` | 1 query → `appPool` | 4 |
| 28 | `backend/src/__tests__/integration.int.test.ts` | Update to use `appPool` + adminPool for teardown | 5 |

### Files That Need NO Changes

| File | Reason |
|------|--------|
| `services/llm/*.ts` (6 files) | No database access |
| `services/calendar.service.ts` | No database access (interface only) |
| `services/recovery/webchat.channel.ts` | Uses repositories (no direct pool) |
| `services/recovery/whatsapp.channel.ts` | No database access |
| `services/recovery/voice.channel.ts` | No database access |
| `services/recovery/sms.channel.ts` | No database access |
| `services/recovery/channel.interface.ts` | No database access |
| `services/onboarding/onboarding.service.ts` | Uses `onboardingRepository` (no direct pool) |
| `services/onboarding/templates.ts` | No database access |
| `services/index.ts` | Barrel export only |
| `services/followup.service.ts` | Uses repositories (no direct pool) |
| `services/availability.service.ts` | Uses repositories (no direct pool) |
| `services/notification.service.ts` | Uses repositories (no direct pool) |
| `controllers/conversation.controller.ts` | Uses repositories (no direct pool) |
| `controllers/notification.controller.ts` | Uses repositories (no direct pool) |
| `controllers/followup.controller.ts` | Uses repositories (no direct pool) |
| `controllers/availability.controller.ts` | Uses repositories (no direct pool) |
| `middleware/authenticate.ts` | Uses Supabase client, not pool |
| `middleware/auth.ts` | No database access |
| `middleware/session.ts` | No database access |
| `middleware/rate-limit.ts` | No database access |

### Summary

| Category | Count |
|----------|-------|
| Files that MUST change | 5 |
| Files that SHOULD change | 23 |
| Files that need NO changes | 19+ |

---

## 8. Rollback Strategy

### Per-Phase Rollback

| Phase | Rollback Command | Time to Recover |
|-------|-----------------|-----------------|
| 0 | Revert `db.ts`, remove `identity-context.ts` from middleware, drop `app_user` role | 30 min |
| 1 | Revert `db.ts` to export single pool | 5 min |
| 2 | Revert controller changes, `git checkout -- controllers/` | 15 min |
| 3 | Revert service changes | 10 min |
| 4 | Revert middleware imports | 5 min |
| 5 | No rollback needed (testing only) | — |

### Emergency Rollback (Any Phase)

If production is broken:

```bash
# 1. Revert ALL changes from this branch
git checkout main -- backend/src/config/db.ts backend/src/config/index.ts backend/src/app.ts

# 2. Remove new middleware
git rm backend/src/middleware/identity-context.ts backend/src/utils/identity-store.ts

# 3. Revert any permissions changes
# (Connect directly to DB as postgres)
psql $DATABASE_URL -c "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM app_user;"
psql $DATABASE_URL -c "DROP ROLE IF EXISTS app_user;"

# 4. Restart the server
npm run build && npm run start

# Total time: ~10 minutes
```

---

## 9. Risks

### Risk 1: `app_user` Permission Gaps

**Scenario:** A query fails because `app_user` lacks permission on a specific table or column.

**Impact:** Route returns 500 error. User-facing functionality breaks.

**Mitigation:**
- During Phase 0, grant `SELECT, INSERT, UPDATE, DELETE` on ALL existing tables via `ALTER DEFAULT PRIVILEGES`
- During Phase 5, run the full integration test suite
- For new tables added after Phase 0, the default privileges handle permissions automatically

### Risk 2: AsyncLocalStorage Memory Leak

**Scenario:** A request doesn't clean up its AsyncLocalStorage context, causing subsequent requests (reusing the same async context) to inherit stale identity.

**Impact:** User A sees User B's data — tenant isolation failure.

**Mitigation:**
- Use `AsyncLocalStorage.run()` with `new Map()` for each request (not `.enterWith()`)
- Clean up in a `res.on('finish')` handler
- Add a test that forces context leakage
- Set default session values to NULL (fail closed, not open)

### Risk 3: Accidental `adminPool` Usage

**Scenario:** A developer imports `adminPool` instead of `appPool` in a controller, bypassing RLS unintentionally.

**Impact:** Data leak across tenants.

**Mitigation:**
- ESLint rule: `no-restricted-imports` — restrict `adminPool` imports to whitelisted files
- Code review checklist item: "Is this `adminPool` or `appPool`?"
- Log every `adminPool` query in production (with business_id if available)
- Consider not exporting `adminPool` by default — require explicit path import

### Risk 4: Transaction Scope Identity Loss

**Scenario:** A multi-statement transaction uses `pool.connect()` to get a dedicated client. The `SET LOCAL` variables set by the pool wrapper are not propagated to this dedicated client.

**Impact:** Within the transaction, RLS policies see NULL identity. Queries inside the transaction fail or return wrong data.

**Mitigation:**
- Ensure the identity wrapper also intercepts `pool.connect()` and applies `SET LOCAL` on the acquired client
- Test all `pool.connect()` call sites (4 found: `customer.repository.ts`, `onboarding.repository.ts`, `settings.controller.ts`, `founder.controller.ts`)

### Risk 5: Anonymous Chat Performance

**Scenario:** The session-based RLS policy for anonymous chat checks `customer_sessions` on every `messages` INSERT. With millions of messages, this subquery becomes expensive.

**Impact:** Chat latency increases under load.

**Mitigation:**
- Ensure `customer_sessions.session_id` index exists (already UNIQUE)
- Consider caching session-to-business mapping in Redis or in-memory
- Monitor `pg_stat_statements` after Phase 5

### Risk 6: Scheduler Identity

**Scenario:** The recovery scheduler runs every 30 seconds using `adminPool`. If a bug causes it to use `appPool` instead, it would need to set identity variables — but there's no user context in a background job.

**Impact:** Scheduler crashes or returns empty results.

**Mitigation:**
- Scheduler explicitly imports and uses `adminPool`
- `appPool` query wrapper gracefully handles NULL identity (no crash — just returns what RLS allows, which may be empty for cross-tenant queries)
- Add a startup test that verifies scheduler can query across tenants

---

## 10. Decision

### RLS Readiness Score

| Criterion | Score (1-10) | Notes |
|-----------|-------------|-------|
| Current architecture readiness | **2/10** | Superuser pool, no identity propagation, 67 direct pool.query() calls outside repos |
| Architectural plan clarity | **8/10** | Clear phases, file mapping, rollback, risks documented |
| Migration safety | **6/10** | Phased approach with per-phase rollback |
| Anonymous path complexity | **4/10** | Session-based RLS is novel and untested |
| Scheduler path complexity | **7/10** | adminPool pattern is clean, governance is manual |
| Total estimated effort | **8-13 days** | 5 phases, 28 file changes |

### Recommendation

**APPROVED for RLS preparation — with conditions.**

The architecture plan is sound. The hybrid approach (Option D: `app_user` pool + SET LOCAL in middleware) is the right balance of security and migration effort.

**Conditions for approval:**

1. **Phase 0 must be completed and verified** before any RLS policies are designed. No policy design work until `app_user` role exists and `auth.uid()` returns the correct value on pool connections.

2. **Phase 2 must be fully completed** for all controllers. Until all 67 direct `pool.query()` calls outside repositories are migrated through `appPool`, the identity context cannot be guaranteed for all queries.

3. **Anonymous chat path must have a dedicated test plan.** The session-based RLS approach (using `app.session_id` when `app.user_id` is NULL) is the most novel and risky part of this architecture. It must be validated with a focused test suite before Phase 6 (RLS enablement).

4. **ESLint rule `no-restricted-imports` for `adminPool`** must be in place before Phase 0 ships to production. This prevents accidental RLS bypass.

5. **The existing `docs/rls-audit.md` must be re-run** after this foundation is in place. Many assumptions in that document change once `app_user` is the query role.

**Do NOT proceed to `docs/rls-audit.md` Phase 0 (schema fixes) or any RLS policy design until this foundation is fully implemented and verified.**

---

*End of Security Foundation Architecture Audit*
