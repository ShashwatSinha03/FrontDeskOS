# Authentication & RBAC — Architecture Design

**Date:** 2026-06-11
**Status:** Approved

## Goal

Replace the current API-key-based access model with Supabase Auth + role-based access control. Founder accesses `/ops` via login. Business owners/staff access only their business dashboards. Every action is tied to an authenticated user.

## Core Principle

Wrap existing functionality. Do NOT rewrite AI receptionist, booking engine, LangGraph, Founder OS business logic, tenant dashboards, or onboarding wizard.

## Data Model

### `profiles` (new table)

Platform-level identity. One record per authenticated user.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | References auth.users(id) |
| email | VARCHAR | |
| full_name | VARCHAR | |
| global_role | VARCHAR | `SUPER_ADMIN` or `USER` |
| last_login_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

Rules:
- Shashwat = SUPER_ADMIN
- Everyone else = USER
- Profiles = source of truth for platform identity

### `staff_profiles` (extend existing table)

Business membership. Do NOT rename, do NOT create `business_members`.

Add columns:

| Column | Type | Notes |
|--------|------|-------|
| invited_by | UUID NULL | References staff_profiles.id |
| status | VARCHAR | `pending`, `accepted`, `suspended` |
| invited_at | TIMESTAMPTZ | |
| accepted_at | TIMESTAMPTZ | |

Existing columns (unchanged): `id`, `user_id`, `business_id`, `role`, `full_name`, `created_at`, `updated_at`

Business roles: `owner`, `manager`, `staff`

Rules:
- `staff_profiles` = source of truth for business membership
- A user may belong to multiple businesses

## Authentication Strategy

- **Provider:** Supabase Auth (email + password only)
- **Frontend:** `@supabase/ssr` for Next.js (cookie-based sessions)
- **Backend:** Bearer token verification via `supabase.auth.getUser(token)`
- **No:** Magic links, Google OAuth, custom JWT, shared cookies between Next.js and Express

## Login Flow

- Single login page at `/login`
- Forgot password and reset password flows
- Redirect preservation: `/login?redirect=/ops`

After login:
1. If `redirect` param exists → verify permission → redirect there
2. Otherwise → SUPER_ADMIN → `/ops`, OWNER/MANAGER/STAFF → first business admin dashboard

## Session Transmission

Frontend sends every protected API request with:
```
Authorization: Bearer <access_token>
```

Backend verifies via `supabase.auth.getUser(token)`.

## Middleware Stack (Express)

### `authenticate()`

Supports two auth methods:
1. **User auth** — Bearer token → `supabase.auth.getUser()` → `req.authContext = { type: "user", userId: "..." }`
2. **Service auth** — `x-api-key` header → `req.authContext = { type: "service", service: "cron" }`

Controllers consume only `req.authContext`. They never know how auth occurred.

### `loadProfile()`

Loads `profiles` record. Attaches `req.profile`.

### `loadMembership()`

Loads `staff_profiles` record for the current business context. Attaches `req.membership`.

### `requireSuperAdmin()`

Allows only `profiles.global_role === SUPER_ADMIN`.

Used for: `/ops/*`, `/api/admin/founder/*`

### `requireBusinessRole(roles: string[])`

Allows only specified business roles. Used for `/{slug}/admin/*`.

Verifies: user is authenticated → has `staff_profiles` record → role is in allowed list → business matches requested slug.

## Route Protection

### Founder OS
```
authenticate → loadProfile → requireSuperAdmin → controller
```

### Tenant Dashboard
```
authenticate → loadProfile → loadMembership → requireBusinessRole(['owner', 'manager', 'staff']) → controller
```

### Owner-only Tenant Routes
```
authenticate → loadProfile → loadMembership → requireBusinessRole(['owner']) → controller
```

## API Key Strategy

API keys remain temporarily for:
- Cron jobs
- Internal services
- Future webhooks

NOT for browser users. As session auth is verified per-route, the frontend API key proxy will be removed route-by-route.

## Migration Plan (Phases)

| Phase | What | Risk |
|-------|------|------|
| A | `profiles` table + `staff_profiles` migration | None (DDL only) |
| B | Middleware stack + backend session auth | Low (additive, routes use new middleware) |
| C | Frontend packages + Supabase client + login page | Low (additive) |
| D | Founder OS protection via middleware | Medium (sign out to test) |
| E | Tenant dashboard protection via middleware | Medium (sign out to test) |
| F | Remove frontend API key dependency | Medium (browser traffic switches to session) |
| G | API keys become service-only | Low |

## User Management

### `/ops/users` (SUPER_ADMIN only)
- View all users, roles, business memberships
- Suspend/activate user
- Remove membership
- Change business role

### Tenant Dashboard → Settings → Team (Owner only)
- Invite staff (creates pending invitation)
- Change staff role
- Suspend/remove staff
- Cannot create SUPER_ADMIN

## Permission Matrix

| Role | Founder OS | Own Business | Other Business | Billing | Team Mgmt | Appts | Leads | Escalations | Staff |
|------|-----------|-------------|---------------|---------|-----------|-------|-------|-------------|-------|
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| OWNER | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| MANAGER | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| STAFF | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Unauthenticated | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Verification Requirements

- Founder: login → access `/ops` → denied from tenant-only routes
- Owner: login → access own business → denied from other businesses
- Manager: access allowed routes → denied billing/settings
- Staff: access appointments/conversations → denied management routes
- Unauthenticated: blocked from all protected routes

## Non-Negotiables

Do NOT modify:
- AI receptionist
- Booking workflows
- LangGraph
- Founder OS business logic
- Tenant dashboard business logic
- Onboarding wizard functionality

Auth must wrap existing functionality, not rewrite it.
