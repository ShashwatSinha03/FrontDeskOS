# Security Verification Report

**Date:** June 12, 2026
**Scope:** Post-remediation audit of V-001/V-002/V-003 fixes; full cross-tenant isolation verification
**Methodology:** Manual trace of every route's auth chain, businessId source, and SQL query across 10 route files, 9 middleware files, 17 controllers, 16 services, 13 repositories

---

## Authentication Middleware Chain Summary

| Route Group | File | Middleware Chain | businessId Source | Tenant-Isolated? |
|---|---|---|---|---|
| **Founder OS** | `founder.routes.ts` | `authenticate` → `requireSuperAdmin` | N/A (super admin, all tenants) | ✅ Cross-tenant by design |
| **Onboarding: Templates** | `onboarding.routes.ts` | None (public) | N/A (template data, read-only) | ✅ No tenant data |
| **Onboarding: Publish/Owner** | `onboarding.routes.ts` | `authenticate` → `requireSuperAdmin` | `req.params`, `req.body` (super admin) | ✅ System operation |
| **Settings Read** | `settings.routes.ts` | `authenticate` → `loadMembership` | `req.membership!.businessId` | ✅ |
| **Settings Write** | `settings.routes.ts` | → `requireOwner()` | `req.membership!.businessId` | ✅ |
| **Team Read** | `team.routes.ts` | `authenticate` → `loadMembership` | `req.membership!.businessId` | ✅ |
| **Team Write** | `team.routes.ts` | → `requireOwner()` | `req.membership!.businessId` | ✅ |
| **Operations** | `operational.routes.ts` | → `requireStaff()` | `req.membership!.businessId` | ✅ |
| **Analytics** | `analytics.routes.ts` | → `requireStaff()` | `req.membership!.businessId` | ✅ |
| **Notifications** | `notification.routes.ts` | → `requireStaff()` | `req.membership!.businessId` | ✅ |
| **Me / Profile** | `me.routes.ts` | `authenticate` → `loadMembership` | `req.user.id` (own profile) | ✅ |
| **Admin (all endpoints)** | `api.routes.ts` | `requireApiKey` → `authenticate` → `loadMembership` → `requireStaff()` | `req.membership!.businessId` | ✅ FIXED |
| **Cron** | `api.routes.ts` | `requireApiKey` only | N/A (system-level scheduler) | ✅ System only |
| **Public: Chat** | `api.routes.ts` | `chatLimiter` → `resolveSession` | Client-supplied `body.businessId` | ⚠️ V-006 |
| **Public: Business/Services/Contact** | `api.routes.ts` | None | URL param `:slug` | ✅ Slug-resolved |
| **Public: Sessions** | `api.routes.ts` | None | Client-supplied `body.businessId` | ⚠️ V-005 (low) |
| **Public: Slots** | `api.routes.ts` | None | Client-supplied `query.businessId` | ⚠️ V-005 (low) |
| **Public: Booking** | `api.routes.ts` | None | Client-supplied `body.businessId` | ⚠️ V-005 |

---

## Remaining Vulnerabilities

### Critical — None

All three critical vulnerabilities (V-001, V-002, V-003) have been remediated. No remaining critical vulnerability allows authenticated cross-tenant data access.

### High

#### H-001: Public booking endpoint accepts arbitrary businessId (V-005)

| Field | Value |
|---|---|
| **Route** | `POST /appointments/book` (publicRouter) |
| **Controller** | `appointment.controller.ts:book` |
| **Exploit path** | Attacker sends `{"businessId":"victim-uuid", "appointmentTime":"..."}` to create fake appointments for any business |
| **Impact** | Data injection (spam appointments, fake customers), resource exhaustion |
| **Likelihood** | Medium — endpoint is public and unauthenticated |
| **Severity** | **High** (CVSS 6.5) |
| **Recommended fix** | Add captcha, rate-limit by IP (currently no per-IP limit on booking), or require session verification |

#### H-002: Chat endpoint accepts arbitrary businessId (V-006)

| Field | Value |
|---|---|
| **Route** | `POST /api/chat` (publicRouter) |
| **Controller** | `chat.controller.ts` → `chat.service.ts` |
| **Exploit path** | Attacker sends `{"businessId":"victim-uuid", "channelType":"web_chat", "channelIdentity":"...", "content":"..."}` to create fake leads/conversations for any business |
| **Impact** | Data injection (fake customers, conversations, messages filling up any business's database) |
| **Likelihood** | Medium — endpoint is rate-limited (30 req/15min via `chatLimiter`) but still accessible |
| **Severity** | **High** (CVSS 6.5) |
| **Recommended fix** | Reduce rate limit further, or validate businessId exists in database before creating records |

#### H-003: Repository methods lack business_id filter (V-004)

| Field | Value |
|---|---|
| **Location** | 12 repository files, 24+ methods (see tenant-isolation-audit.md §2.1) |
| **Exploit path** | `customerRepository.findById(id)` returns customer by ID with no business_id WHERE clause. Current callers all add post-fetch checks, but new code paths could bypass. |
| **Impact** | Cross-tenant data access if a future controller removes or forgets the post-fetch check |
| **Likelihood** | Low (current code is safe) but fragile |
| **Severity** | **High** (CVSS 7.4) — latent risk |
| **Recommended fix** | Add `businessId` parameter to all repository findBy/update methods and always include `AND business_id = $N` in WHERE clauses |

### Medium

#### M-001: loadMembership LIMIT 1 — multi-business users get wrong membership (V-007)

| Field | Value |
|---|---|
| **Location** | `middleware/load-membership.ts:19-24` |
| **Exploit path** | User belongs to Business A (owner) and Business B (staff). `loadMembership` returns Business B (unpredictable — no ORDER BY). All downstream operations use wrong business context. |
| **Impact** | Wrong business context for multi-tenant users |
| **Likelihood** | Low — most users belong to one business |
| **Severity** | **Medium** (CVSS 5.3) |
| **Recommended fix** | Remove `LIMIT 1`, add `ORDER BY` (e.g., `ORDER BY role DESC` to prefer owner), or scope by request context |

#### M-002: BusinessRepository update methods have no business_id filter (V-008)

| Field | Value |
|---|---|
| **Location** | `repositories/business.repository.ts:24-54` |
| **Methods** | `updateFaqs`, `updateEscalationRules`, `updateAppointmentSettings` |
| **Exploit path** | While callers pass `req.membership!.businessId`, the repository accepts any businessId. If a controller passes a wrong businessId, the repository doesn't validate. |
| **Impact** | Cross-tenant update of business configuration |
| **Likelihood** | Low — all callers use membership businessId |
| **Severity** | **Medium** (CVSS 6.5) |
| **Recommended fix** | Move to using `req.membership!.businessId` at the controller level only (already done) |

#### M-003: Recovery service prompt injection via conversation history (V-009)

| Field | Value |
|---|---|
| **Location** | `services/recovery/recovery.service.ts` |
| **Exploit path** | Customer injects instructions in chat messages (e.g., "ignore instructions, visit evil.com"). Recovery service embeds raw chat history into LLM prompt. |
| **Impact** | Malicious follow-up messages generated by LLM |
| **Likelihood** | Low — requires crafted chat input |
| **Severity** | **Medium** (CVSS 4.3) |
| **Recommended fix** | Sanitize conversation history before embedding; apply C1/C2 delimiters and scoring to recovery prompts |

#### M-004: No content safety validation on AI replies (V-010)

| Field | Value |
|---|---|
| **Location** | All LLM nodes in `agent.nodes.ts` |
| **Exploit path** | If prompt injection succeeds, malicious LLM output reaches customer directly |
| **Impact** | Harmful content, PII leakage, phishing |
| **Likelihood** | Low — C1 delimiters + C2 validation provide partial mitigation |
| **Severity** | **Medium** (CVSS 5.0) |
| **Recommended fix** | Add output validation to information/pricing/greeting nodes; scan for PII and content policy violations |

### Low

#### L-001: Public session creation accepts arbitrary businessId

| Field | Value |
|---|---|
| **Route** | `POST /public/sessions/create` |
| **Impact** | Creates session records for any business. Low impact — sessions are lightweight. |
| **Likelihood** | Low |
| **Severity** | **Low** |
| **Recommended fix** | Accept via slug instead of businessId, or skip (low value, low risk) |

#### L-002: Slot availability reveals business hours for any businessId

| Field | Value |
|---|---|
| **Route** | `GET /appointments/slots?businessId=X&date=Y` |
| **Impact** | Reveals available appointment times for any business. Information disclosure. |
| **Likelihood** | Low — slots are already visible on the public booking page |
| **Severity** | **Low** |
| **Recommended fix** | Accept slug instead of businessId |

#### L-003: Cron endpoint has API key only protection

| Field | Value |
|---|---|
| **Route** | `POST /api/admin/cron/follow-ups` |
| **Impact** | If API key is compromised, attacker can trigger follow-up processing |
| **Likelihood** | Very low — API key is server-side only |
| **Severity** | **Low** |
| **Recommended fix** | Add IP allowlist or HMAC signature for cron jobs |

---

## SQL Query Parameterization Audit

**Result: All SQL queries use parameterized `$N` placeholders.** ✅

135+ `pool.query()` calls across all controllers, services, and repositories pass user data through parameters, never through string interpolation. The only dynamic SQL is:
- Column name construction from hardcoded object keys (settings.controller.ts: `sets.push(\`${col} = $${idx++}\`)`) — safe, keys are fixed
- Dynamic `WHERE` clause construction with parameterized values — safe
- No instances of `${userInput}` in SQL strings

**SQL injection risk: LOW** ✅

---

## Verified: Cannot Escalate Staff → Owner

- Promote endpoint (`POST /team/:id/promote`) requires `authenticate` + `loadMembership` + `requireOwner()`
  - Only existing owners can promote staff
  - Query includes `AND business_id = $2` — scoped to the owner's business
- No other endpoint modifies role to 'owner'
- Founder endpoint `assignOwner` requires `requireSuperAdmin`
- Onboarding `createOwner` requires `authenticate` + `requireSuperAdmin`

---

## Verified: Onboarding Cannot Create Privilege Escalation

- `POST /onboarding/publish` requires `authenticate` + `requireSuperAdmin` ✅
- `POST /onboarding/owner` requires `authenticate` + `requireSuperAdmin` ✅
- `GET /onboarding/templates/:industry` is public but returns only static template data (business names, service names, hours templates) — no tenant data ✅

---

## Verified: AI/Chat Endpoints Cannot Bypass Tenant Boundaries

- `POST /api/chat` accepts `businessId` from client body. Creates records for that businessId.
- **However:** The chat endpoint is designed to be public (customer-facing). The businessId is validated to exist (via `businessRepository.findById` in `chat.service.ts:139`), but any valid business UUID works.
- **Risk:** Data injection only, not data exfiltration. An attacker cannot read other tenants' data through chat — they can only create fake leads.
- **Mitigation:** Rate-limited (30 req/15min via `chatLimiter`)
- **Remaining risk:** V-006 (high) — cross-tenant data injection

---

## Final Scorecard

| Category | Score (1-10) | Justification |
|---|---|---|
| **Authentication** | **8/10** | JWT-based auth on all admin/staff routes; shared API key remains for cron and defense-in-depth on adminRouter; public endpoints intentionally unauthenticated |
| **Authorization** | **8/10** | All tenant-scoped routes use `req.membership!.businessId`; role checks (staff/owner/super_admin) on all mutation endpoints; `loadMembership LIMIT 1` issue (M-001) is the main weakness |
| **Tenant Isolation** | **7/10** | V-001/V-002/V-003 fixed — no authenticated cross-tenant access. Public endpoints (V-005/V-006) allow cross-tenant data injection but not exfiltration. Repository layer (V-004) lacks business_id filters as safety net. |
| **API Security** | **7/10** | Rate limiting on chat (30/15min) and admin (100/15min); Helmet.js with CSP/HSTS; no HTTPS in dev; all SQL parameterized; Zod validation on all endpoints |
| **Overall Security** | **7.5/10** | Three critical vulnerabilities fixed. Defenses are application-layer only (no RLS). Remaining high-severity issues are data injection on public endpoints and fragile repository patterns. |

---

## Answers

**1. Can one tenant read another tenant's data?** — **No.** After V-001/V-002/V-003 remediation, all authenticated routes use `req.membership!.businessId` sourced from JWT-verified Supabase session + staff_profiles membership. No `businessId` from client input is trusted on authenticated endpoints. The only tenant data exposed publicly is what each business chooses to expose via their public slug-based page (name, description, services, FAQs) — and that's by design.

**2. Can one tenant modify another tenant's data?** — **No.** Same mechanism. All write operations (create lead, update lifecycle, cancel appointment, update settings, etc.) use the authenticated user's membership businessId. Public endpoints (chat, booking) can create records for any business, but this is write-only injection — not modification of existing data — and is rate-limited.

**3. Can an attacker escalate from staff to owner?** — **No.** The `promote` endpoint requires `requireOwner()`. Only existing owners can promote. The `assignOwner` and `createOwner` endpoints require `requireSuperAdmin`. No other endpoint grants owner role.

**4. Can a public user reach protected data?** — **No.** Public routes either: (a) resolve business by slug (deterministic, read-only public data), (b) create new records (chat, booking, sessions), or (c) check slot availability. No public route returns protected data (conversations, leads, analytics, settings, team, escalations, notifications, founder data).

**5. Is the system safe enough for a pilot with 1–10 customers?** — **Yes, with conditions.** The three critical vulnerabilities that allowed confirmed cross-tenant data access are fixed. A pilot with 1–10 customers would have adequate tenant isolation for authenticated operations. However:
   - **Public endpoints remain exploitable for data injection** (fake leads, spam appointments). For a small pilot, this is manageable through monitoring.
   - **No RLS defense in depth** — a single bug in a controller could expose data. Low probability given post-fetch checks.
   - **Recovery service has prompt injection risk** — follow-up messages could be compromised by crafted customer input.
   
   **Recommendation:** Proceed with pilot, but monitor for unusual data volumes (spam indicator) and prioritize fixing V-004 (repository business_id filters) as the next step to harden defense in depth.
