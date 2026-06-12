# Business Suspension Enforcement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enforce `business.status = 'disabled'` at every layer — backend middleware, public endpoints, and frontend admin layout.

**Architecture:** Modify existing `requireBusinessAccess()` middleware to check business status, wire it into all 6 protected route groups. Create new `requireActiveBusiness()` middleware for public booking/chat/session endpoints. Enhance `loadMembership()` to include business status for frontend detection.

**Tech Stack:** Express.js middlewares, PostgreSQL, Next.js App Router, TypeScript

---

## Business Suspension Enforcement Report

### Current Behavior

When a founder sets `business.status = 'disabled'` via the ops UI:

- The database column is updated
- The ops detail page shows "disabled" status
- **No enforcement exists anywhere in the system**
- Owners, staff, and public users continue accessing all admin/operational/settings/team/analytics/notification/booking/chat functionality

The `requireBusinessAccess` middleware at `backend/src/middleware/require-business-access.ts`:
- Is **completely dead code** — never imported or wired into any route
- Only checks membership status (`active`/`invited`/`suspended`), NOT business status

### Security Impact

**Medium.** A disabled business is the platform's emergency kill switch. Without enforcement:
- An owner/staff member of a terminated business can still operate normally
- Booking/chat continue accepting customers for a disabled business
- The only indicator is a cosmetic badge on the ops table

### Routes Affected

**Blocked (403 BUSINESS_DISABLED):**

| Route Group | Files | Middleware Chain |
|---|---|---|
| `/api/dashboard/*`, `/api/leads/*`, `/api/appointments/*`, `/api/escalations/*`, `/api/knowledge-base/*`, `/api/availability/*`, `/api/follow-ups/*`, `/api/recovery/*` | `api.routes.ts` adminRouter | `adminAuth` → add `requireBusinessAccess()` |
| `/api/conversations/:id/messages` | `api.routes.ts` adminRouter | Same `adminAuth` chain |
| `/api/operate/*` | `operational.routes.ts` | `requireStaff()` → add `requireBusinessAccess()` |
| `/api/settings/*` | `settings.routes.ts` | Both `readRouter` and `writeRouter` → add `requireBusinessAccess()` |
| `/api/team/*` | `team.routes.ts` | All routes → add `requireBusinessAccess()` |
| `/api/analytics/*` | `analytics.routes.ts` | `requireStaff()` → add `requireBusinessAccess()` |
| `/api/notifications/*` | `notification.routes.ts` | `requireStaff()` → add `requireBusinessAccess()` |
| `POST /api/chat` | `api.routes.ts` publicRouter | Add `requireActiveBusiness()` |
| `GET /api/appointments/slots` | `api.routes.ts` publicRouter | Add `requireActiveBusiness()` |
| `POST /api/appointments/book` | `api.routes.ts` publicRouter | Add `requireActiveBusiness()` |
| `POST /api/public/sessions/create` | `api.routes.ts` publicRouter | Add `requireActiveBusiness()` |

**NOT blocked:**

| Route | Reason |
|---|---|
| `/api/ops/*` | Founder routes — spec exempt |
| `/api/me/membership` | Needed to detect disabled state |
| `/api/me/profile` | Profile read |
| `/api/public/businesses/:slug` | Public website |
| `/api/public/businesses/:slug/services` | Public website |
| `/api/public/businesses/:slug/contact` | Public website |
| `/api/health` | System health |
| Admin cron `POST /api/cron/follow-ups` | System internal |

### Middleware Changes

**1. `requireBusinessAccess()` — Enhanced**

Current: checks membership active + slug match
After: adds `SELECT status FROM businesses WHERE id = $1` using `req.membership.businessId`

```typescript
const bizResult = await pool.query(
  'SELECT status FROM businesses WHERE id = $1',
  [req.membership.businessId]
);
if (bizResult.rows.length > 0 && bizResult.rows[0].status === 'disabled') {
  res.status(403).json({ success: false, error: 'BUSINESS_DISABLED' });
  return;
}
```

**2. `requireActiveBusiness()` — NEW**

For public endpoints without authentication. Reads `businessId` from body/query (pre-existing pattern, not introducing new vulnerability).

```typescript
export function requireActiveBusiness() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = req.body?.businessId || req.query?.businessId as string;
    if (!businessId) {
      res.status(400).json({ success: false, error: 'businessId is required' });
      return;
    }
    const result = await pool.query(
      'SELECT status FROM businesses WHERE id = $1',
      [businessId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Business not found' });
      return;
    }
    if (result.rows[0].status === 'disabled') {
      res.status(403).json({ success: false, error: 'BUSINESS_DISABLED' });
      return;
    }
    next();
  };
}
```

**3. `loadMembership()` — Enhanced**

Add `business_status` to the JOIN query so the frontend admin layout can detect disabled state via `GET /api/me/membership`.

### Regression Risks

1. **Founder routes** use `authenticate` + `requireSuperAdmin` only — never run `loadMembership`, so `requireBusinessAccess()` can't fire. ✅
2. **meRouter** uses `authenticate` + `loadMembership` but not `requireBusinessAccess()`. Membership/profile endpoints work even when disabled. ✅
3. **settingsRouter reads**: Adding `requireBusinessAccess()` to `readRouter` correctly blocks reads for disabled businesses. ✅
4. **Public endpoints**: `requireActiveBusiness()` reads `businessId` from client input — same source controllers already use, no new vulnerability. ⚠️ Pre-existing (H-001).
5. **Conversations route** uses `adminAuth` chain — correctly blocked for disabled businesses. ✅

---

## Implementation Plan

### Task 1: Enhance `requireBusinessAccess()` middleware

**Files:**
- Modify: `backend/src/middleware/require-business-access.ts`

**Steps:**

1. Add business status query after membership.active check
2. Return 403 with `BUSINESS_DISABLED` if status === 'disabled'

### Task 2: Create `requireActiveBusiness()` middleware

**Files:**
- Create: `backend/src/middleware/require-active-business.ts`

**Steps:**

1. Create middleware that reads `businessId` from body/query
2. Query business status
3. Return 403 if disabled

### Task 3: Export from middleware index

**Files:**
- Modify: `backend/src/middleware/index.ts`

**Steps:**

1. Add `requireActiveBusiness` export

### Task 4: Enhance `loadMembership()` with business status

**Files:**
- Modify: `backend/src/middleware/load-membership.ts`
- Modify: `backend/src/types/express.d.ts` (Membership type — if needed)

**Steps:**

1. Update SQL query to JOIN businesses and select `b.status AS business_status`
2. Add `businessStatus` to the returned membership object

### Task 5: Wire `requireBusinessAccess()` into all route groups

**Files:**
- Modify: `backend/src/routes/operational.routes.ts:8`
- Modify: `backend/src/routes/settings.routes.ts:6-7, 16-18`
- Modify: `backend/src/routes/team.routes.ts:7-12`
- Modify: `backend/src/routes/analytics.routes.ts:8`
- Modify: `backend/src/routes/notification.routes.ts:8`
- Modify: `backend/src/routes/api.routes.ts:40`

**Steps:**

1. Import `requireBusinessAccess` in each file
2. Add to middleware chain at the appropriate position (after `requireStaff()` or `requireOwner()`)
3. For `api.routes.ts`, add to the `adminAuth` array

### Task 6: Wire `requireActiveBusiness()` into public endpoints

**Files:**
- Modify: `backend/src/routes/api.routes.ts:23, 28, 29, 30`

**Steps:**

1. Import `requireActiveBusiness`
2. Add before booking, chat, slots, and session creation routes

### Task 7: Frontend admin layout — detect and handle disabled business

**Files:**
- Modify: `frontend/src/app/[businessSlug]/admin/layout.tsx`

**Steps:**

1. Read `membership.businessStatus` after fetching membership
2. If `'disabled'`, redirect to a disabled page or show an error

### Task 8: TypeScript compilation verification

Run `npx tsc --noEmit` in both backend and frontend directories.

---

## Verification Plan

| # | Test | Expected Result |
|---|---|---|
| 1 | Set `business.status = 'disabled'` in DB | — |
| 2 | GET `/api/dashboard/summary` as owner | 403 `BUSINESS_DISABLED` |
| 3 | GET `/api/operate/leads` as staff | 403 `BUSINESS_DISABLED` |
| 4 | GET `/api/settings/business` as owner | 403 `BUSINESS_DISABLED` |
| 5 | GET `/api/team` as owner | 403 `BUSINESS_DISABLED` |
| 6 | GET `/api/analytics/overview` as staff | 403 `BUSINESS_DISABLED` |
| 7 | GET `/api/notifications` as staff | 403 `BUSINESS_DISABLED` |
| 8 | POST `/api/chat` with disabled businessId | 403 `BUSINESS_DISABLED` |
| 9 | GET `/api/appointments/slots` with disabled businessId | 403 `BUSINESS_DISABLED` |
| 10 | POST `/api/appointments/book` with disabled businessId | 403 `BUSINESS_DISABLED` |
| 11 | POST `/api/public/sessions/create` with disabled businessId | 403 `BUSINESS_DISABLED` |
| 12 | GET `/api/ops/businesses` as super admin | ✅ Works (founder exempt) |
| 13 | GET `/api/public/businesses/:slug` | ✅ Works (public website) |
| 14 | GET `/api/me/membership` | ✅ Works, includes `businessStatus: 'disabled'` |
| 15 | Set `business.status = 'active'` | All endpoints work again |
| 16 | Membership status `suspended` | Still independently blocked by `requireRole()` |
