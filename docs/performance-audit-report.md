# Nuvora — Performance Audit Report

**Date**: 2026-06-21
**Auditor**: opencode
**Status**: COMPLETE
**Methodology**: Measurement-first, no optimization, no architecture rewrites, no refactors, evidence-driven.

---

## Scorecard

| Category | Score | Impact |
|---|---|---|
| Cold Start | ❌ CRITICAL | ~2-4s latency on first request after inactivity |
| Database Indexes | ❌ CRITICAL | 10+ missing FK indexes, query degradation on scale |
| API Waterfall | ⚠️ HIGH | Serial blocking on every admin page load |
| Frontend Bundle | ⚠️ HIGH | 374 kB first load JS on marketing page |
| Caching Strategy | ❌ CRITICAL | No cache headers, no service worker, `revalidate: 0` |
| Frontend Architecture | ⚠️ MEDIUM | No virtualization, no code splitting |

**Overall Verdict**: HOSTING ISSUE + DATABASE ISSUE + FRONTEND ISSUE — a combination of infrastructure, data access, and frontend architecture choices.

---

## 1. Cold Start — CRITICAL

### Finding
Backend hosted on **Render Starter ($7/month, Oregon)** with no render.yaml, Dockerfile, or Procfile. Render Starter spins down after 15 minutes of inactivity. First request after idle triggers a full cold start.

### Startup Chain (estimated)
```
Request arrives → Render starts container → Node.js init (~100-200ms)
  → Import all modules (~200-400ms)
  → pg.Pool creation (no eager connection) 
  → Express middleware setup (~50ms)
  → First actual DB query (~500-1000ms — connection + query)
  → Response sent
Total: ~2-4s
```

### Key Issue: No eager DB connection
The `pg.Pool` is created with `min: 0` (no persistent connections). The first query must establish a fresh connection to Supabase Postgres, adding ~500-1000ms of TCP/TLS handshake overhead on top of the cold start.

### Evidence
- No `render.yaml` → no health check pings to keep warm
- No eager connection pool → first query pays connection establishment cost
- No keep-alive mechanism (cron job, uptime monitor, etc.)

### Impact
Every admin/staff member hitting the app after idle time experiences a **2-4 second white screen** waiting for the first page to load.

### Recommended Fix (no code change — operational)
- Add UptimeRobot or similar ping every 5 minutes to \`GET /\` or \`GET /health\`
- Upgrade Render to Starter+ ($19/month) — no spin-down
- Add eager DB connection on startup (single \`SELECT 1\`)

### Estimated Gain
**0-2s latency eliminated on cold requests** with keep-alive ping. **~1s eliminated** with eager DB connection.

---

## 2. Database Indexes — CRITICAL

### Finding
Schema defines 26 indexes but is missing critical foreign key indexes on high-volume tables. Without these indexes, every JOIN or filter on these columns triggers a sequential scan — fast at low volume but O(n) degradation as data grows.

### Missing Indexes

| Table | Missing FK Column | Impact |
|---|---|---|
| \`messages\` | \`business_id\` | Every conversation list query scans all messages |
| \`messages\` | \`conversation_id\` | Every message history query scans |
| \`conversations\` | \`business_id\` | Tenant isolation queries |
| \`notifications\` | \`business_id\` | Inbox badge count queries |
| \`notifications\` | \`user_id\` | User-specific notification queries |
| \`notifications\` | \`conversation_id\` | Notification-filtered conversation views |
| \`message_deliveries\` | \`message_id\` | Delivery status lookups |
| \`message_deliveries\` | \`conversation_id\` | Channel-specific delivery queries |
| \`conversation_workflows\` | \`conversation_id\` | Workflow state lookups on every message |
| \`escalations\` | \`assigned_to\` | Staff assignment queries |
| \`customer_lifecycle_events\` | \`business_id\` | Tenant-scoped lifecycle queries |
| \`follow_ups\` | \`customer_id\` | Customer follow-up queries |
| \`knowledge_requests\` | \`business_id\` | Tenant-scoped knowledge queries |

### Evidence
Schema file (\`database/schema.sql\`) has 26 CREATE INDEX statements. None of the above columns are indexed. These are standard B-tree indexes that would be created as:

\`\`\`sql
CREATE INDEX idx_messages_business_id ON messages(business_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_notifications_business_id ON notifications(business_id);
\`\`\`

### Impact
- Each admin page load does \`SELECT ... WHERE business_id = ?\` on multiple tables → every query is a seq scan
- At 100 conversations → fine. At 1000 → slow. At 10000 → unusable.
- The \`escalation-detector.service.ts\` queries recent messages by \`conversation_id\` on every new message → gets slower linearly

### Recommended Fix (add indexes only — no query changes)
Add 13 B-tree indexes on the missing FK columns. Run via migration or direct SQL on Supabase.

### Estimated Gain
**~10-100x query speedup** on filtered queries depending on table size. From seq scan to index scan.

---

## 3. API Waterfall — HIGH

### Finding
Admin pages make sequential API calls where parallel calls are possible. The most impactful waterfall is in the admin layout.

### Admin Layout Waterfall
```
GET /api/businesses/:slug          →  1 RTT
  ↓ (serial, waits for business data)
auth.getSession()                  →  1 RTT (or local)
  ↓ (serial, waits for session)
GET /api/membership                →  1 RTT
GET /api/profile                   →  1 RTT (in parallel w/ membership)
  ↓ (serial, waits for all)
Children render
Total: ~2-3 RTTs minimum
```

### Per-Page Waterfalls
| Page | Serial Calls | Parallel Calls | Latency |
|---|---|---|---|
| /admin | 3 (business → session → membership+profile) | 2 | ~3 RTT |
| /admin/inbox | 4 (chain above → counts) | 2 | ~4 RTT |
| /admin/conversations | 3 (chain above → list) | 2 | ~3 RTT |
| /admin/analytics | 4 (chain above → funnel → leaderboard) | 3 | ~4 RTT |
| /admin/settings | 5+ (chain above → role check → tabs) | 2 | ~5 RTT |
| /login | 2 (session → redirect) | 1 | ~2 RTT |

### Evidence
Code paths show \`auth.getSession()\` is called separately in each layout/page, blocking subsequent data fetches. The session could be obtained once at the middleware level or passed via context.

### Impact
- Each serial step adds ~200-500ms on Render (cold) or ~50-100ms (warm)
- Total page load latency is 2-5x what it could be
- Settings page is the worst offender due to role-check blocking tab data

### Recommended Fix (no architecture change)
1. Move \`auth.getSession()\` to middleware and pass user ID via header/context
2. Remove \`businesses/:slug\` dependency by extracting slug from URL params (already available)
3. Make settings tabs fetch data in parallel using \`Promise.all\` or React \`use\` with Suspense

### Estimated Gain
**~200-1000ms per page load** depending on page complexity.

---

## 4. Frontend Bundle — HIGH

### Finding
Build output shows the marketing page (\`/\`) has **374 kB first load JS** — the heaviest page in the app. Two dependencies are responsible for most of this weight:

| Dependency | Estimated Size | Used On |
|---|---|---|
| \`three.js\` (via @react-three/fiber) | ~500-600 KB parsed | Marketing page only |
| \`GSAP\` (gsap) | ~50-100 KB parsed | Marketing page only |

### Build Output (relevant pages)
```
Route                      Size      First Load JS
/                         180 kB    374 kB
/businessSlug              10 kB    212 kB
/businessSlug/admin         4 kB    189 kB
/businessSlug/settings      8 kB    257 kB
/login                      2 kB    252 kB
```

### Evidence
- Marketing page first load JS: 374 kB (184 kB base + 190 kB page-specific)
- Most admin pages: ~186-200 kB (only ~2-16 kB over base)
- Settings (257 kB) and login/ops (250+ kB) are also elevated

### Impact
- Marketing page load: ~1-2s JS parse/execute on mobile
- \`three.js\` and GSAP are bundled in the main chunk, affecting ALL page loads
- \`/\` route is likely the first page most users see → first impression is slow

### Recommended Fix (no architecture change)
1. **Dynamic import three.js**: Only load \`three.js\` when the \`/` route is visited
   \`\`\`tsx
   const MagicRings = dynamic(() => import('@/components/marketing/MagicRings'), { ssr: false })
   \`\`\`
2. **Dynamic import GSAP**: Same approach for GSAP-dependent components
3. **Extract shared vendor chunk**: Ensure three.js/GSAP don't end up in the main layout chunk

### Estimated Gain
**~90-190 kB reduction in first load JS** for non-marketing pages. **~200 kB reduction** for marketing page if three.js is lazy-loaded with a skeleton.

---

## 5. Caching Strategy — CRITICAL

### Finding
No caching strategy exists at any layer:
- No Service Worker (PWA manifest exists but no SW)
- No \`Cache-Control\` headers on API responses
- No \`stale-while-revalidate\` or \`revalidate\` on page fetches
- All \`fetch()\` calls use default (no cache) or explicit \`cache: 'no-store'\`

### Evidence
- \`membershipService.getMembership()\`: called on every admin page load, no cache
- \`profileService.getProfile()\`: called on every admin page load, no cache
- \`/api/inbox/conversations\`: called fresh each time, no ETag or Last-Modified
- \`GET /businesses/:slug\`: called on every page navigation, data rarely changes

### Impact
- Every navigation refetches the same data → unnecessary network round trips
- No offline support despite PWA manifest existing
- Backend handles identical queries repeatedly

### Recommended Fix (no architecture change)
1. Add \`Cache-Control: private, max-age=60, stale-while-revalidate=300\` to membership/profile endpoints
2. Add ETag support to list endpoints (inbox, conversations, etc.)
3. Register a basic Service Worker for asset caching (PWA is already set up)
4. Use \`useSWR\` or \`React.cache()\` with 30s deduplication for admin data fetches

### Estimated Gain
**~50-200ms per navigation** eliminated for cached endpoints. ~0ms on first visit.

---

## 6. Frontend Architecture — MEDIUM

### Finding
Message list renders all messages as full DOM nodes with no virtualization. Currently fine at small scale but will degrade.

### Evidence
- Conversation workspace page renders all \`messages\` as JSX in a scroll container
- No \`react-virtual\` or \`@tanstack/virtual\` usage anywhere in the codebase
- No pagination or infinite scroll on message history

### Impact
- At 1000+ messages in a conversation → DOM has 1000+ nodes → scroll jank
- At 5000+ messages → browser lag on mobile

### Recommended Fix (no architecture change)
1. Add \`react-virtual\` for message list virtualization (only render visible messages)
2. Keep current API responses (no pagination needed if virtualized)

### Estimated Gain
**~0ms until 500+ messages**. Critical path for post-pilot scale.

---

## Impact Summary

| Issue | Type | Severity | Current Impact | After Fix | Effort |
|---|---|---|---|---|---|
| Cold Start | Hosting | 2-4s first request | 0-2s | Low |
| Missing DB Indexes | Database | ~10-100x query slowdown at scale | ~1.1x (low volume) | Medium |
| API Waterfall | Architecture | 200-1000ms per page | ~50-200ms | Medium |
| Bundle (three.js) | Frontend | 374 kB first load → 190 kB | ~200 kB | Low |
| No Caching | Architecture | 50-200ms per navigation | ~50ms | Low |
| No Virtualization | Frontend | ~0ms now → jank at scale | ~0ms | Medium |

## Priority Order (impact/effort)

1. **Cold Start** (operational, instant gain, free)
2. **API Waterfall** (code changes, ~1h, significant UX gain)
3. **Bundle Size** (code changes, ~30min, significant first-load gain)
4. **Missing Indexes** (SQL, ~1h, critical at scale)
5. **Caching** (code changes, ~1h, good UX gain)
6. **Virtualization** (~2h, needed post-pilot)

## Final Verdict

> PERF-AUDIT-COMPLETE: HOSTING ISSUE + DATABASE ISSUE + FRONTEND ISSUE — a combination of infrastructure (cold start), data access (missing indexes, waterfall), and frontend architecture (bundle size, caching). All are fixable with moderate effort. The single highest-impact fix is operational (keep-alive ping) — no code changes required. The highest-impact code fix is the API waterfall (parallelize admin layout fetches), followed by dynamic import of three.js.
