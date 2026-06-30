# Nuvora Founder Readiness Audit

**Audit Date:** 2026-06-14
**Audit Scope:** Full-stack, end-to-end
**System Version:** Pre-pilot (FrontDeskOS → Nuvora)

---

## 1. Executive Summary

**Verdict: NOT READY FOR PILOT**

Nuvora has strong architectural foundations — clean service boundaries, deterministic workflow state, proper tenant isolation, and comprehensive TypeScript types. However, this audit identified **4 blockers** that will cause runtime failures for real customers, **6 critical security vulnerabilities**, and **17 high-severity issues** spanning data integrity, AI safety, operational visibility, and deployment readiness.

The system is approximately 2-3 weeks of focused engineering from being ready for a **limited pilot** with 1-2 controlled businesses.

### Blocker Summary (Must Fix Before Any Customer Onboards)

| # | Issue | Severity | Area |
|---|---|---|---|
| B1 | `messages` table INSERT references non-existent `business_id` column | CRITICAL | Database |
| B2 | `services` table missing `is_active` column — CRUD fails at runtime | CRITICAL | Database |
| B3 | `notifications` table has no migration — all notification operations fail | CRITICAL | Database |
| B4 | AI agent double-books appointments (no availability check in agent path) | CRITICAL | Booking |

### Critical Security Issues

| # | Issue | Severity | Area |
|---|---|---|---|
| S1 | WhatsApp status callback has no signature validation — spoofable | CRITICAL | WhatsApp |
| S2 | Meta verify token bypass — any verification request passes | CRITICAL | WhatsApp |
| S3 | Disabled businesses can still send/receive WhatsApp | HIGH | WhatsApp |
| S4 | Twilio auth tokens stored in plaintext in DB | HIGH | Security |
| S5 | AI skips customer confirmation — auto-books on first message | HIGH | AI |
| S6 | No business hours validation for LLM-provided times | HIGH | AI |

---

## 2. Architecture Overview

```
nuvoraos.app ──────────────────────────────────────┐
brightsmile.nuvoraos.app  (Vercel — Next.js 15)     │
  ├── Marketing pages                                │
  ├── Multi-tenant subdomain routing                 │
  ├── Admin dashboards (owner/staff)                 │
  ├── Chat widget (Website Chat)                     │
  └── Booking flow                                   │
                                                     │
api.nuvoraos.app ──── (Render — Express 4.19) ──────┤
  ├── LangGraph AI Agent (Groq/OpenAI/Anthropic)     │
  ├── Multi-channel (web_chat, WhatsApp, SMS*, Voice*)│
  ├── Appointment engine                             │
  ├── Recovery/Follow-up engine                      │
  └── Cron: automated follow-ups                     │
                                                     │
Supabase Postgres ──── (Managed, ap-northeast-1) ────┘
  ├── 20 tables (2 missing migrations)               │
  ├── 7 enums                                        │
  ├── RLS enabled on all tables                      │
  └── 1 auto-update trigger (workflows only)         │
```

**\*** = stub implementations, not functional

---

## 3. Route Inventory

### 3.1 Frontend Routes

| Route | Type | Auth | Role |
|---|---|---|---|
| `/` | Marketing | None | Public |
| `/terms` | Legal | None | Public |
| `/privacy` | Legal | None | Public |
| `/acceptable-use` | Legal | None | Public |
| `/login` | Auth | None | Public |
| `/forgot-password` | Auth | None | Public |
| `/reset-password` | Auth | Session | Authenticated |
| `/unauthorized` | Utility | None | Public |
| `/auth/callback` | API | None | OAuth |
| `/api/admin/[...path]` | API Proxy | Bearer | Authenticated |
| `/[businessSlug]` | Business | None | Public |
| `/[businessSlug]/services` | Business | None | Public |
| `/[businessSlug]/book` | Booking | None | Public |
| `/[businessSlug]/book/success` | Booking | None | Public |
| `/[businessSlug]/contact` | Business | None | Public |
| `/[businessSlug]/admin` | Dashboard | Session + Membership | Owner/Staff |
| `/[businessSlug]/admin/analytics` | Dashboard | Session + Membership | Owner/Staff |
| `/[businessSlug]/admin/settings` | Dashboard | Session + Membership | Owner (edit) / Staff (view) |
| `/[businessSlug]/admin/follow-ups` | Dashboard | Session + Membership | Owner/Staff |
| `/[businessSlug]/admin/learning-inbox` | Dashboard | Session + Membership | Owner/Staff |
| `/[businessSlug]/admin/leads` | Dashboard | Session + Membership | Owner/Staff |
| `/[businessSlug]/admin/leads/[id]` | Dashboard | Session + Membership | Owner/Staff |
| `/[businessSlug]/admin/appointments` | Dashboard | Session + Membership | Owner/Staff |
| `/[businessSlug]/admin/escalations` | Dashboard | Session + Membership | Owner/Staff |
| `/[businessSlug]/admin/team` | Dashboard | Session + Membership | Owner/Staff |
| `/ops` | Founder | Session + SUPER_ADMIN | Founder |
| `/ops/onboarding` | Founder | Session + SUPER_ADMIN | Founder |
| `/ops/onboarding/success` | Founder | Session + SUPER_ADMIN | Founder |
| `/ops/businesses` | Founder | Session + SUPER_ADMIN | Founder |
| `/ops/businesses/[id]` | Founder | Session + SUPER_ADMIN | Founder |
| `/ops/businesses/[id]/edit` | Founder | Session + SUPER_ADMIN | Founder |
| `/ops/users` | Founder | Session + SUPER_ADMIN | Founder |
| `/ops/users/[id]` | Founder | Session + SUPER_ADMIN | Founder |

**Total: 36 route entries (plus layout files)**

### 3.2 Backend API Endpoints

| Method | Path | Auth | Domain |
|---|---|---|---|
| GET | `/health` | None | System |
| POST | `/api/chat` | ActiveBusiness + Turnstile + Session | Chat |
| GET | `/api/public/businesses/:slug` | None | Public |
| GET | `/api/public/businesses/:slug/services` | None | Public |
| POST | `/api/public/businesses/:slug/contact` | Turnstile | Public |
| POST | `/api/public/sessions/create` | ActiveBusiness | Session |
| GET | `/api/appointments/slots` | ActiveBusiness | Booking |
| POST | `/api/appointments/book` | ActiveBusiness + Turnstile | Booking |
| GET | `/api/webhooks/twilio/whatsapp` | None (verify token) | WhatsApp |
| POST | `/api/webhooks/twilio/whatsapp` | Optional Twilio sig | WhatsApp |
| POST | `/api/webhooks/twilio/status` | None | WhatsApp |
| GET | `/api/me/membership` | Auth + Membership | User |
| GET | `/api/me/profile` | Auth + Membership | User |
| GET / POST | `/api/team/*` (5 routes) | Auth + Owner/Staff | Team |
| GET / PATCH / POST / PUT | `/api/settings/*` (13 routes) | Auth + Owner/Staff | Settings |
| GET / PATCH / POST | `/api/operate/*` (8 routes) | Auth + Staff | Operations |
| GET / PATCH | `/api/notifications/*` (4 routes) | Auth + Staff | Notifications |
| GET | `/api/analytics/*` (4 routes) | Auth + Staff | Analytics |
| GET / PATCH / POST / DELETE | `/api/ops/*` (13 routes) | Auth + SUPER_ADMIN | Founder |
| GET / POST | `/api/onboarding/*` (3 routes) | API Key + SUPER_ADMIN | Onboarding |
| GET / POST / PUT / DELETE | `/api/*` (22 routes) | API Key + Auth + Staff | Admin |
| POST | `/api/cron/follow-ups` | API Key only | Cron |

**Total: 94 endpoints (1 dead route: `GET /api/_health` never mounted)**

---

## 4. Workflow Inventory

### 4.1 Website Chat

```
Entry:       Customer types in chat widget
States:      idle → messaging → (active) → closed
Transitions: message in → AI responds → recovery scheduled if idle
Exit:        Conversation closed by staff OR 30d inactivity
Failure:     LLM provider down → error returned to customer
```

### 4.2 WhatsApp Chat

```
Entry:       Customer sends WhatsApp message
States:      idle → inbound → (resolved) → closed
Transitions: message in → business resolved by number → AI responds
Exit:        Conversation closed by staff
Failure:     Twilio outage → message queued but no retry
```

### 4.3 Booking (AI-Driven)

```
Entry:       Customer expresses booking intent
States:      STARTED → COLLECTING_SERVICE → COLLECTING_DATE →
             COLLECTING_TIME → COLLECTING_CUSTOMER_DETAILS →
             CHECKING_AVAILABILITY → BOOKED | CANCELLED
Transitions: computeWorkflowState() is deterministic from collectedData
Exit:        BOOKED or CANCELLED
Failure:     LLM hallucinates time outside business hours → no validation
             Double booking possible (no DB-level unique constraint)
```

### 4.4 Booking (Self-Service — Frontend)

```
Entry:       Customer visits /[slug]/book
States:      StepService → StepDate → StepTime → StepInfo → StepConfirm
Transitions: User clicks through 5-step wizard
Exit:        Confirmation page with sessionStorage data
Failure:     No recovery if browser is closed mid-flow
```

### 4.5 Lead Capture

```
Entry:       New customer messages
States:      New Inquiry → Information Gathering → Qualified →
             Booking Opportunity → Booked → Customer (positive)
             OR → Lost (negative)
Transitions: AI updates lifecycle, staff can also update manually
Exit:        Customer (converted) or Lost (churned)
Failure:     No workflow tracking — interrupted lead capture has no state
```

### 4.6 Escalation

```
Entry:       Customer asks for human OR agent detects escalation keyword
States:      pending → resolved
Transitions: Staff resolves via dashboard
Exit:        Resolution with optional note
Failure:     No auto-notification to owner (fire-and-forget)
```

### 4.7 Appointment Confirmation

```
Entry:       Appointment created (pending status)
States:      pending → confirmed → completed | cancelled | rescheduled
Transitions: Staff confirms via dashboard (NOT done by AI)
Failure:     AI books but never confirms — appointment stays pending
```

### 4.8 Owner Onboarding

```
Entry:       Founder starts wizard at /ops/onboarding
States:      7 steps: Industry → Business → Services → Hours → FAQs → AI → Review
Transitions: Auto-saves draft, supports resume
Exit:        Publish → owner account creation → success page
Failure:     Publish is idempotent, but schema mismatch may cause errors
```

---

## 5. Customer Journey Audit

### 5.1 Website Visitor → Lead

| Step | Friction | Severity |
|---|---|---|
| Discovers business page | No loading delay, skeleton states present | OK |
| Asks questions via chat | AI may hallucinate answers (prompted to guess) | HIGH |
| Requests booking | Turnstile validates if configured | OK |
| Self-service booking flow | 5-step wizard, functional | OK |
| AI books without confirmation | Customer receives "Booked!" before confirming | HIGH |
| Returns later | Session recovery via sessionStorage | OK |
| Changes mind about time | Field-level merge works | OK |

### 5.2 WhatsApp Visitor

| Step | Friction | Severity |
|---|---|---|
| Sends greeting | AI responds, workflow recovery if exists | OK |
| Asks FAQ | May not know answer → knowledge request created | OK |
| Requests appointment | Booking workflow initializes | OK |
| Provides details | Direct-answer extraction reduces repetition | OK |
| Changes appointment | RescheduleNode has no workflow tracking | MEDIUM |
| Asks for human | Escalation created, but owner NOT notified | HIGH |
| Goes idle | Recovery scheduled (web_chat only, WhatsApp stub) | HIGH |

### 5.3 Dead Ends

| Scenario | What happens | Severity |
|---|---|---|
| Customer sends "cancel" mid-booking | Cancellation runs immediately, no confirmation | HIGH |
| Customer closes browser mid-booking | No saved draft for self-service flow | MEDIUM |
| Customer switches from chat to WhatsApp | No cross-channel conversation linking | MEDIUM |
| Customer's phone number changes | No merge capability, creates new customer | MEDIUM |
| Twilio sends duplicate webhook | Both processed, no idempotency key | MEDIUM |

---

## 6. Owner Journey Audit

### 6.1 Onboarding

| Step | Friction | Severity |
|---|---|---|
| Founder creates business via wizard | Well-designed, 7 steps, draft save | OK |
| Owner receives account | Password returned in response body | HIGH |
| Owner logs in | Supabase auth, standard flow | OK |
| Owner sees dashboard | Aggregated KPIs, lead funnel, today's appointments | OK |
| No "Getting Started" guide | New owner sees dashboard without guidance | MEDIUM |
| No empty state for zero data | Dashboard shows "0" with no tutorial | MEDIUM |

### 6.2 Daily Operations

| Task | UX Assessment | Severity |
|---|---|---|
| View leads | Filterable by state, searchable, paginated | OK |
| Qualify leads | Lifecycle state dropdown, one-click | OK |
| View appointments | Filterable by status, paginated | OK |
| Confirm appointment | Button in table | OK |
| View analytics | 4 metric cards, charts, trends, funnel | OK |
| Check follow-ups | Paginated data table, filters | OK |
| Approve knowledge requests | Slide-out detail panel | OK |
| Handle escalations | Inline resolve with optional note | OK |
| No notification for escalation | Owner must check escalations page | HIGH |

### 6.3 Settings

| Tab | UX Assessment | Severity |
|---|---|---|
| Business profile | Form, saves correctly | OK |
| Services | CRUD table with enable/disable | OK |
| Hours | Per-day time picker | OK |
| FAQs | Add/edit/reorder/delete | OK |
| AI config | Greeting, lead capture, booking, escalation email | OK |
| Team | Management component | OK |
| Channels | WhatsApp number, web chat toggle | OK |
| Voice AI | "Coming Soon" — present but non-functional | MEDIUM |

### 6.4 Missing Owner Features

| Feature | Impact | Severity |
|---|---|---|
| No conversation history viewer | Cannot review past AI-customer conversations | HIGH |
| No message log per lead | Customer detail shows basic info only | MEDIUM |
| No notification preferences | Cannot configure what to be notified about | MEDIUM |
| No SMS/email notification | No out-of-band alerts for critical events | HIGH |

---

## 7. Founder Journey Audit

### 7.1 Can founder do without SQL?

| Task | Via UI? | Notes |
|---|---|---|
| Create business | YES | `/ops/onboarding` wizard |
| Assign owner | YES | `/ops/onboarding/success` or `/ops/businesses/:id/edit` |
| Disable business | YES | `/ops/businesses/:id` toggle |
| Enable business | YES | `/ops/businesses/:id` toggle |
| View activity | PARTIAL | Overview shows counts, not activity log |
| Troubleshoot issues | PARTIAL | No conversation viewer, no message log |
| View all businesses | YES | `/ops/businesses` list with search |
| View all users | YES | `/ops/users` list with filter |
| Manage users | YES | Reset password, suspend, transfer ownership |
| Edit business details | YES | `/ops/businesses/:id/edit` |
| Remove staff | YES | Via transfer ownership / remove membership |
| View platform analytics | NO | No cross-business analytics |
| View error logs | NO | Requires Render dashboard |
| Replay conversations | NO | Not implemented |

### 7.2 Founder Gaps

| Gap | Impact | Severity |
|---|---|---|
| No activity audit log | Cannot see who did what across platform | HIGH |
| No business-level conversation browser | Cannot review AI performance per business | HIGH |
| No system health dashboard | Cannot see LLM provider status, DB health | MEDIUM |
| No webhook test tool | Cannot test WhatsApp setup without real message | MEDIUM |
| No impersonation mode | Cannot "see what the customer sees" | MEDIUM |

---

## 8. AI Receptionist Audit

### 8.1 Architecture

The AI agent uses a **LangGraph StateGraph** with 10 nodes:

```
START → intentDetector → routeByIntent()
  ├── greeting → greetingNode
  ├── information → informationNode
  ├── pricing → pricingNode
  ├── booking → bookingNode
  ├── reschedule → rescheduleNode
  ├── cancellation → cancellationNode
  ├── lead_capture → leadCaptureNode
  ├── escalation → escalationNode
  ├── human_request → humanRequestNode
  └── unknown → unknownNode
```

### 8.2 Findings

| Finding | Severity | Detail |
|---|---|---|
| LLM controls state advancement | FIXED | `computeWorkflowState()` is pure logic now |
| Repeated questions | FIXED | `lastAskedField` tracking prevents loops |
| Greeting recovery | FIXED | Works via workflow persistence |
| Availability hallucination | FIXED | Auto-queried at CHECKING_AVAILABILITY |
| **Auto-booking without confirmation** | **HIGH** | Prompt says "Do NOT wait for separate confirmation" |
| **No business hours validation** | **HIGH** | `isValidFutureDateTime` only checks future UTC |
| **Double booking (agent path)** | **CRITICAL** | No availability check before `appointmentRepository.create()` |
| **Cancellation without confirmation** | **HIGH** | Runs immediately, no "Are you sure?" |
| **Reschedule has no workflow** | **MEDIUM** | Interrupted reschedule has no recovery state |
| **Lead capture has no workflow** | **MEDIUM** | Interrupted lead capture has no recovery state |
| **CONFIRMING state is dead code** | **MEDIUM** | `computeWorkflowState()` never produces it |
| **Prompt injection detection is passive** | **MEDIUM** | Detected injection is only logged, never blocked |
| **LLM hallucinates `suggestedAnswer`** | **MEDIUM** | Prompt explicitly asks LLM to guess business info |
| **History slicing is fragile** | **LOW** | `history.slice(0, -1)` may exclude wrong message |
| **`validateAppointmentOwnership` unused** | **LOW** | Dead code |

### 8.3 Direct Answer Extraction

`isDirectAnswerToLastField` works correctly for all field types. Verifies: date (YYYY-MM-DD, today, tomorrow, relative), time (HH:MM, HHam/pm), service (non-greeting, >2 chars), name (2+ alpha chars), phone (7+ digits/symbols). ✓

### 8.4 State Machine Completeness

```
STARTED → COLLECTING_SERVICE → COLLECTING_DATE → COLLECTING_TIME →
COLLECTING_CUSTOMER_DETAILS → CHECKING_AVAILABILITY → BOOKED | CANCELLED
```

Gap: No workflow for reschedule, cancellation, or lead capture.

---

## 9. Booking System Audit

### 9.1 Slot Retrieval

| Aspect | Assessment | Severity |
|---|---|---|
| Available slot query | Correctly filters booked appointments | OK |
| Timezone handling | `Intl.DateTimeFormat`, two-pass DST-safe | OK |
| Working hours respect | Reads from `appointment_settings.workingHours` | OK |
| Service duration | Uses 30-min default when no service selected | LOW |
| Cache (15-min TTL) | Implemented in `workflow-state.service.ts` | OK |

### 9.2 Booking Creation

| Path | Availability Check? | Confirmation? | Problem |
|---|---|---|---|
| Self-service (frontend) | YES | YES (5-step wizard) | OK |
| AI agent path | **NO** | **NO** | **DOUBLE BOOKING** |
| Admin API | YES | YES | OK |

### 9.3 Race Conditions

| Scenario | Risk | Mitigation |
|---|---|---|
| Two customers book same slot simultaneously | HIGH — both pass if no concurrent booking exists | No `SELECT FOR UPDATE`, no DB unique constraint on `(business_id, appointment_time)` |
| AI books same slot as frontend booking | HIGH — agent path skips availability check | Agent must call `checkAvailability()` before creating |
| `refreshAvailability` races with booking | MEDIUM — TOCTOU between SELECT and INSERT | Need transaction |

### 9.4 Timezone Edge Cases

| Scenario | Handled? | Detail |
|---|---|---|
| DST spring-forward (missing hour) | YES | Two-pass algorithm, uses offset before gap |
| DST fall-back (ambiguous hour) | YES | Maps to first occurrence (daylight time) |
| Business near dateline (e.g., Pacific) | YES | Works correctly via IANA timezone |
| 12:00 AM midnight | YES | Handled |
| 12:00 PM noon | YES | Handled |

### 9.5 Appointment Lifecycle Gaps

| Gap | Impact | Severity |
|---|---|---|
| AI books but never confirms | Appointment stays `pending` indefinitely | MEDIUM |
| No auto-reminder for upcoming appointments | Customer may forget | MEDIUM |
| No reschedule workflow tracking | Cannot recover interrupted reschedule | MEDIUM |
| No cancellation reason collection (agent path) | Lost data for churn analysis | LOW |

---

## 10. Lead System Audit

### 10.1 Lead Creation Paths

| Path | Customer Created? | Lifecycle Set? | Channel Linked? |
|---|---|---|---|
| Website Chat (new) | YES | `New Inquiry` | YES (customer_channels) |
| WhatsApp (new) | YES | `New Inquiry` | YES (phone as channel identity) |
| Contact form | YES | `New Inquiry` | YES |
| Manual (admin) | YES | Per form | Not linked |
| Self-service booking | YES (or reused) | `New Inquiry` or updated | YES |

### 10.2 Lifecycle State Machine

```
              ┌───────────────────────────────────────┐
              │                                       │
              v                                       │
New Inquiry ──→ Information Gathering ──→ Qualified ──┘
                                              │
                                              v
                                   Booking Opportunity ──→ Booked ──→ Customer
                                              │
                                              v
                                           Follow-Up Pending ──→ Lost
                                              │
                                              v
                                         Escalated ──→ (resolved)
```

### 10.3 Gaps

| Gap | Impact | Severity |
|---|---|---|
| No lead deduplication by phone across channels | WhatsApp and Web Chat can create duplicate customers | MEDIUM |
| No UNIQUE constraint on `(business_id, phone)` | Insert succeeds even with duplicate phone | MEDIUM |
| Lead capture has no workflow state | Interrupted lead capture has no recovery | MEDIUM |
| No lead source tracking | Cannot distinguish Website Chat vs WhatsApp vs Manual | MEDIUM |
| No lead scoring | All leads treated equally | LOW |
| No lead assignment to specific staff | All leads visible to all staff | LOW |

---

## 11. WhatsApp Audit

### 11.1 Inbound Flow

```
Twilio → POST /api/webhooks/twilio/whatsapp
  → Twilio signature validation (optional — can be bypassed)
  → Resolve business by `config_json->>whatsappNumber`
  → `chatService.handleIncomingMessage(channelType: 'whatsapp')`
  → Resolve customer by phone → Create if new
  → Create/find conversation → Persist message → AI → Deliver reply
```

### 11.2 Outbound Flow

```
ChatService → deliveryService.sendMessage()
  → Get WhatsAppAdapter from registry
  → Resolve provider credentials (DB config or env vars)
  → twilio.messages.create() with statusCallback URL
  → Create delivery record → Return
```

### 11.3 Findings

| Finding | Severity | Detail |
|---|---|---|
| **Status callback has NO auth** | **CRITICAL** | `POST /api/webhooks/twilio/status` accepts any POST, forges delivery status |
| **Meta verify token bypass** | **CRITICAL** | Any `hub.challenge` request is accepted even if token doesn't match |
| **Disabled business still uses WhatsApp** | **HIGH** | Webhook handler doesn't check `businesses.status` |
| **Twilio auth tokens in plaintext** | **HIGH** | `config_json.authToken` stored in JSONB, visible to DB readers |
| **Signature validation silently skipped** | **HIGH** | If `TWILIO_AUTH_TOKEN` unset, no warning, no validation |
| **Same number across businesses** | **HIGH** | No constraint preventing two businesses using same WhatsApp number |
| **Global credential fallback** | **MEDIUM** | Falls back to env vars if per-business creds unset |
| **No cron retry for failed deliveries** | **MEDIUM** | Failed messages stay failed, no retry mechanism |
| **Recovery WhatsApp channel is stub** | **HIGH** | Recovery service can't send WhatsApp messages |
| **`businessId` in status URL query params** | **LOW** | Visible in Twilio console logs |

### 11.4 Duplicate Customer Prevention

The `customer_channels` UNIQUE constraint on `(channel_type, channel_identity)` prevents the same phone number from creating duplicate customer channel records. However, the `customers` table has **no UNIQUE on `(business_id, phone)`**, so a phone number could appear on two customer records if created through different paths (e.g., one via WhatsApp, one via manual lead creation with the same phone).

### 11.5 Cross-Tenant Leakage

**Risk: LOW.** The WhatsApp number in `config_json` is the tenant isolation anchor. Business resolution queries `WHERE channel_type = 'whatsapp' AND enabled = true AND config_json->>'whatsappNumber' = $1 LIMIT 1`. All subsequent operations are scoped to the resolved `businessId`. The only risk is two businesses configuring the same number.

---

## 12. Security Audit

### 12.1 Authentication Summary

| Mechanism | Implementation | Assessment |
|---|---|---|
| Supabase Auth (JWT) | `Bearer` token → `auth.getUser()` | Standard, well-implemented |
| API Key (`x-api-key`) | Single shared secret against `ADMIN_API_KEY` | Works, but shared secret is a weakness |
| Turnstile (CAPTCHA) | Server-side verification | OK, but no action/cdata validation |
| Rate limiting | In-memory (express-rate-limit) | OK for single instance, breaks with scaling |
| Helmet security headers | Enabled | OK |
| CORS | Whitelist of known domains | OK |
| JSON body limit | 10kb | OK |

### 12.2 Authorization Summary

| Check | Implementation | Assessment |
|---|---|---|
| Business membership | `staff_profiles` + `profiles.global_role` | Well-implemented |
| Role-based (owner/staff) | `requireOwner()`, `requireStaff()` | Clean |
| SUPER_ADMIN only | `requireSuperAdmin()` | Clean |
| Business disabled check | `requireActiveBusiness()` | OK, but bypassed in WhatsApp handler |
| Session resolution | `x-session-id` header | OK |

### 12.3 Tenant Isolation

| Attack Vector | Risk | Current Protection |
|---|---|---|
| Guess another business's slug | LOW | Slug is in URL anyway |
| Access another business via API | LOW | All queries scoped by businessId from membership |
| WhatsApp cross-tenant | MEDIUM | Business resolved by number, but no duplicate check |
| IDOR on appointment/lead IDs | LOW | Business scope check on all admin routes |

### 12.4 Webhook Security

| Webhook | Validation | Risk |
|---|---|---|
| Twilio inbound | Signature via `twilio.validateRequest()` | OK (if token configured) |
| Twilio status | **NONE** | CRITICAL — any POST can spoof delivery status |
| Meta verification | Token comparison (bypassable) | CRITICAL |

### 12.5 Production Secrets Exposure

| Secret | Location | Risk |
|---|---|---|
| `DATABASE_URL` with password | `backend/.env` (plaintext) | FULL DB ACCESS |
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/.env` | FULL SUPABASE ADMIN |
| `GROQ_API_KEY` | `backend/.env` | LLM ACCESS |
| `OPENAI_API_KEY` | `backend/.env` | LLM ACCESS + COST |
| `ADMIN_API_KEY` | `backend/.env`, `frontend/.env.local` | ADMIN API ACCESS |

**All production secrets are stored in plaintext `.env` files on disk.** While `.gitignore`d, any machine compromise or accidental commit would expose all secrets.

---

## 13. Observability Audit

### 13.1 Current Visibility

| Question | Can We Answer? | How |
|---|---|---|
| Why was a lead lost? | PARTIAL | Lifecycle events track state changes, but no reason |
| Why did a booking fail? | PARTIAL | Error logged, but agent path has no availability check |
| Why didn't a message send? | PARTIAL | `message_deliveries` tracks status, but no retry |
| Why did AI respond incorrectly? | **NO** | No conversation replay, no prompt/response logging |
| What LLM model was used? | **NO** | Model name not tracked per message |
| How many tokens per conversation? | **NO** | No token usage tracking |
| How much does each conversation cost? | **NO** | No cost tracking implemented |
| What's the LLM error rate? | **NO** | No aggregation of LLM failures |
| Is the database slow? | PARTIAL | Supabase dashboard shows query insights |
| Are there failed webhooks? | PARTIAL | Render logs, but no aggregation |
| What's the system health? | **NO** | No health dashboard |
| Are there stuck follow-ups? | PARTIAL | `follow_ups` table shows status |

### 13.2 Blind Spots

| Blind Spot | Impact | Severity |
|---|---|---|
| No conversation replay | Cannot debug AI mistakes without reproducing | HIGH |
| No LLM token/cost tracking | Cannot monitor costs, no anomaly detection | HIGH |
| No prompt/response audit log | Cannot review what was sent to the LLM | HIGH |
| No error aggregation | Sentry DSN not configured → errors silently swallowed | HIGH |
| No latency tracking | Cannot detect slow LLM responses | MEDIUM |
| No SLA monitoring | Cannot detect service degradation | MEDIUM |
| No business-level activity log | Cannot answer "what happened in business X today" | MEDIUM |

### 13.3 What Exists

- **Logger:** JSON-structured stdout, supports child loggers with context. No shipping to external aggregation.
- **Sentry:** Configured but **DSN not set** — errors are captured but sent nowhere.
- **Message deliveries:** Full tracking with delivery status, provider, external ID.
- **Lifecycle events:** State transitions logged to `customer_lifecycle_events`.
- **Render logs:** Built-in log viewer with basic search.

---

## 14. Failure Mode Audit

### 14.1 Twilio Outage

| Scenario | Behavior | Gap |
|---|---|---|
| Twilio API down for outbound | `whatsapp.adapter.ts` throws → `deliveryService` marks as failed | No retry queue, message lost |
| Twilio webhook delayed | Message processed late | No idempotency key — duplicate processing possible |
| Twilio webhook lost | Customer message never reaches system | No polling fallback |
| `TWILIO_AUTH_TOKEN` invalid | Outbound fails silently if fallback env vars also wrong | No alert to owner |

**Recovery:** No retry mechanism. Failed messages stay failed. No automatic notification to founder or owner.

### 14.2 LLM Provider Outage

| Scenario | Behavior | Gap |
|---|---|---|
| Groq API down | Chat endpoint throws 500 | Customer sees error, no fallback |
| Groq returns nonsensical output | JSON parsing returns null → fallback to generic reply | No quality check |
| Rate limited (Groq free tier: 30 req/min) | After 30 requests, endpoint returns errors | No queue, no graceful degradation |
| API key invalid/expired | Zod config validation at startup → process exits | App won't start, no health alert |

**Recovery:** No provider fallback (even though multiple providers are configured). No monitoring to detect provider health.

### 14.3 Database Outage

| Scenario | Behavior | Gap |
|---|---|---|
| Postgres down | Pool throws → all endpoints 500 | No read replica, no cached fallback |
| Connection pool exhausted | Queries hang/timeout | Pool configured at 20 connections, no surge protection |
| Migration breaks existing data | Manual rollback needed | No automated rollback |
| Supabase Free tier DB size exceeded (500 MB) | Writes start failing | No monitoring of DB size |

**Recovery:** Render auto-restarts on crash. Pool configured with 10s timeout. No connection throttling.

### 14.4 Webhook Failure

| Scenario | Behavior | Gap |
|---|---|---|
| Twilio can't reach webhook URL | Twilio retries for ~24h | Status endpoint has no validation, so retries work |
| Meta sends duplicate webhook | Both processed | No idempotency check — could create duplicate customer |
| Webhook URL changes | Old URL returns 404 | Meta/Twilio continue retrying, no redirect |

**Recovery:** Twilio has built-in retry. Meta has built-in retry. No idempotency on application side.

### 14.5 Booking Service Failure

| Scenario | Behavior | Gap |
|---|---|---|
| Appointment creation fails | Error caught, customer told "slot may be taken" | Misleading error message |
| Availability service fails | Empty slots returned | Customer sees "no availability" |
| Concurrent booking of last slot | Both succeed (see race condition) | Double booking |

**Recovery:** Error handling exists but has incorrect messaging. No queue for booking requests.

---

## 15. UX Audit

### 15.1 Public Pages

| Page | State | Assessment |
|---|---|---|
| Marketing (`/`) | Default | Clean landing page, good visual hierarchy |
| Business home (`/[slug]`) | Loading | Skeleton states present |
| Business home (`/[slug]`) | Error | `EmptyState` with `AlertCircle` |
| Business home (`/[slug]`) | Not found | "Business not found" |
| Services (`/[slug]/services`) | Loading, Error, Empty | Proper state handling |
| Booking (`/[slug]/book`) | Multi-step | 5-step wizard, clean |
| Booking success (`/[slug]/book/success`) | Session data | Reads from `sessionStorage` — fragile if cleared |
| Contact (`/[slug]/contact`) | Form | Standard form, Turnstile integration |

### 15.2 Admin Pages

| Page | State | Assessment |
|---|---|---|
| Dashboard (`/admin`) | Default | KPIs, funnel, today's appointments, leads, escalations, activity |
| Dashboard (`/admin`) | Empty | Shows zeros, no guidance for new owners |
| Leads (`/admin/leads`) | Filtering | State filter + search, paginated |
| Leads (`/admin/leads`) | Empty | "No leads found" with filter context |
| Appointments (`/admin/appointments`) | Filtering | Status filter, paginated |
| Settings (`/admin/settings`) | 7 tabs | Well-organized, role-aware |
| Settings (staff view) | Read-only | Fields disabled for non-owners |
| Analytics (`/admin/analytics`) | Charts | 4 metric cards, bar/line charts, funnel |
| Follow-ups (`/admin/follow-ups`) | Table | Paginated, filterable |
| Learning Inbox | Tabs | All/Pending/Approved/Rejected |
| Escalations | Inline resolve | Clean |

### 15.3 Founder Pages

| Page | State | Assessment |
|---|---|---|
| Dashboard (`/ops`) | Overview | Stat cards, recent businesses, quick actions |
| Businesses list | Searchable, paginated table | Clean |
| Business detail | Info cards, actions | Owner, status, recent activity |
| Onboarding wizard | 7 steps, auto-save, draft resume | Well-designed |
| Onboarding success | URL cards, owner creation, checklist | Good post-publish flow |
| Users list | Filterable by role | Clean |

### 15.4 UX Problems

| Problem | Location | Severity |
|---|---|---|
| No empty state tutorial for new owners | Admin dashboard | MEDIUM |
| `sessionStorage` for booking success | `/book/success` | MEDIUM — lost if browser closed |
| No notification badge count for escalations | Admin sidebar | MEDIUM |
| No conversation viewer for owners | Missing feature | HIGH |
| No "what happened while you were away" | Dashboard | MEDIUM |
| Booking success URL is shareable but empty | `/book/success` with no sessionData | MEDIUM |
| No loading skeleton for admin tables | Admin pages | LOW |

---

## 16. Database Audit

### 16.1 Table Inventory

| # | Table | Purpose | Rows (approx) | Has Indexes? |
|---|---|---|---|---|
| 1 | `businesses` | Tenant businesses | 5 | PK only |
| 2 | `staff_profiles` | Staff/owner memberships | ~5 | PK + user_id unique |
| 3 | `services` | Business services | 10 | PK only |
| 4 | `customers` | Customer records | ~20 | PK only |
| 5 | `customer_sessions` | Anonymous browsing sessions | ~50 | PK + session_id unique |
| 6 | `customer_channels` | Channel identity linking | ~15 | PK + unique(channel_type, identity) |
| 7 | `conversations` | Chat conversations | 81 | PK only |
| 8 | `messages` | Chat messages | hundreds | PK only |
| 9 | `appointments` | Booked appointments | 5 | PK only |
| 10 | `escalations` | Human intervention requests | 0 | PK only |
| 11 | `knowledge_requests` | AI knowledge gaps | 0 | PK only |
| 12 | `follow_ups` | Scheduled follow-ups | 0 | PK + partial unique |
| 13 | `voice_calls` | Voice call records | 0 | PK + external_sid unique |
| 14 | `customer_lifecycle_events` | State transition log | ~10 | PK only |
| 15 | `availability_schedules` | Business hours per day | ~35 | PK only |
| 16 | `availability_overrides` | Date-specific exceptions | 0 | PK only |
| 17 | `calendar_credentials` | Google Calendar OAuth | 0 | PK only |
| 18 | `business_channels` | Channel configuration | ~5 | business_id + channel_type |
| 19 | `message_deliveries` | Outbound delivery tracking | ~50 | Properly indexed |
| 20 | `conversation_workflows` | Workflow state machine | 0 | Properly indexed |

### 16.2 CRITICAL: Schema Drifts (Migration Missing)

| Issue | Impact | Detail |
|---|---|---|
| `messages` table has no `business_id` column | **INSERT FAILS** | `conversation.repository.ts:68` inserts `business_id` into `messages` table. Column does not exist in migration. |
| `services` table has no `is_active` column | **CRUD FAILS** | `settings.controller.ts:80,117,168,205` queries `is_active`. Not in migration. |
| `notifications` table has NO migration | **ALL NOTIFICATIONS FAIL** | `notification.repository.ts` works on a table that was never created. |
| `businesses` has no `status` column | **QUIET FAILURE** | TypeScript type expects `status`, middleware queries it. Column missing. May return `undefined` silently. |
| `appointment_status` enum lacks `'completed'` | **INSERT FAILS** | TypeScript type includes `completed`, enum only has `pending, confirmed, cancelled, rescheduled`. Setting `status = 'completed'` will fail. |
| `customer_lifecycle_events` lacks `changed_by` column | **QUIET FAILURE** | Repository queries `changed_by`. Column missing, returns `undefined`. |

### 16.3 CRITICAL: Missing Indexes

| Table | Missing Index | Impact |
|---|---|---|
| `customers` | `business_id` | Every dashboard load scans entire table |
| `customers` | `(business_id, lifecycle_state)` | Lead filtering scans entire table |
| `conversations` | `(customer_id, business_id, status)` | Every chat message lookup — most frequent query |
| `messages` | `conversation_id` | Highest volume table — every conversation load |
| `appointments` | `(business_id, appointment_time)` | Calendar/availability queries |
| `follow_ups` | `(status, scheduled_at)` | Background processor scans entire table |
| `customer_channels` | `customer_id` | Customer resolution queries |
| `escalations` | `(business_id, status)` | Dashboard filtering |

**17 out of 20 tables have no non-PK indexes.**

### 16.4 Trigger Analysis

| Trigger | Table | Status |
|---|---|---|
| `update_updated_at_column()` | (none) | **Function defined but never attached to any table** |
| `trg_conversation_workflows_updated_at` | `conversation_workflows` | **Working** (only auto-update trigger in system) |

All other tables rely on application code to manually set `updated_at = NOW()`.

### 16.5 Foreign Key Analysis

| FK | Rule | Assessment |
|---|---|---|
| Everything → `businesses` | CASCADE | Appropriate — business deletion wipes all data |
| Everything → `customers` | CASCADE | Aggressive but intentional |
| `appointments` → `services` | SET NULL | Good — preserves appointment if service deleted |
| `customer_sessions` → `customers` | SET NULL | Good — preserves anonymous history |
| `customer_channels` → `businesses` | **NO FK** | Risk — orphan rows possible |
| `follow_ups` → `voice_calls` | SET NULL | Good |
| `appointments.rescheduled_from_id` | **NO FK** | Risk — dangling reference to moved appointment |

### 16.6 Migration Status

| File | Status |
|---|---|
| `1720000000000_initial-schema.ts` | Applied (20 tables) |
| `1728000000000_create-business-channels.ts` | Applied |
| `1729000000000_create-message-deliveries.ts` | Applied |
| `1730000000000_create-conversation-workflows.ts` | Applied (this sprint) |
| **Migration for `notifications` table** | **MISSING** |
| **Migration for schema drifts** | **MISSING** |
| **Migration for missing indexes** | **MISSING** |
| **Migration for triggers** | **MISSING** |

---

## 17. Deployment Audit

### 17.1 Infrastructure

| Component | Platform | Plan | Region | Cost |
|---|---|---|---|---|
| Frontend | Vercel | Hobby (Free) | Auto | $0 |
| Backend | Render | Starter ($7) | Oregon | $7/mo |
| Database | Supabase | Free (500 MB) | Tokyo | $0 |
| LLM | Groq | Free (30 req/min) | — | $0 |
| Domain | Namecheap | ~$15/yr | — | ~$1/mo |
| **Total** | | | | **~$8/mo** |

### 17.2 CI/CD

**NONE EXISTS.** No GitHub Actions workflows, no automated testing before deploy, no automated rollback.

### 17.3 Monitoring

| Tool | Status |
|---|---|
| Sentry | Configured but **DSN not set** — errors silently swallowed |
| Render dashboard | Basic log viewer, health check auto-restart |
| Vercel analytics | Enabled, automatic |
| Log aggregation | None — stdout only, no shipping |
| Alerting | None |
| Uptime monitoring | None (beyond Render container restart) |

### 17.4 Environment Variables

**Frontend `.env` issue:** `NEXT_PUBLIC_API_URL` points to `frontdeskos.onrender.com` (old service name), not `api.nuvoraos.app`.

### 17.5 Secrets Exposure

All production credentials are stored in **plaintext `.env` files** at:
- `backend/.env` — DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LLM API keys, ADMIN_API_KEY
- `frontend/.env` — Supabase keys
- `frontend/.env.local` — ADMIN_API_KEY

These are gitignored but exist on disk. Machine compromise → full service compromise.

### 17.6 Deployment Gaps

| Gap | Impact | Severity |
|---|---|---|
| No CI/CD pipeline | No automated testing before deploy | HIGH |
| Sentry DSN not configured | No error monitoring | HIGH |
| Frontend API URL points to old service | Will break if old Render is decommissioned | HIGH |
| No `render.yaml` (Infrastructure as Code) | Render config is manual click-ops | MEDIUM |
| No `vercel.json` | Default settings, no explicit configuration | LOW |
| No production Dockerfile | Cannot run in container environments | MEDIUM |
| No external log aggregation | Debugging requires Render log access | MEDIUM |
| No alerting | No one knows if service goes down | HIGH |

---

## 18. Business Readiness Audit

### 18.1 10 Businesses Onboarding Tomorrow — Can Nuvora Support?

| Activity | Ready? | Blockers |
|---|---|---|
| Onboarding wizard | YES | Works for single admin creating businesses |
| Owner account creation | YES | But password returned in response body (security issue) |
| Service setup | PARTIAL | `is_active` column missing — settings page may fail |
| WhatsApp setup | PARTIAL | Needs Twilio credentials per business, stored in plaintext |
| Lead management | PARTIAL | Missing indexes will cause slow queries with real data |
| Appointment management | PARTIAL | Double booking risk, no auto-confirmation |
| AI agent | PARTIAL | Hallucinates times outside business hours, auto-books without confirmation |
| Recovery/follow-ups | PARTIAL | WhatsApp channel is stub — only Website Chat works |
| Owner support | NO | No conversation viewer for owners to review AI chats |
| Troubleshooting | NO | Founder cannot view conversations, no error monitoring |
| Business configuration | YES | Settings pages work for most features |
| Billing preparation | NO | No billing system implemented |

### 18.2 Onboarding Friction (10 Businesses)

| Bottleneck | Impact |
|---|---|
| Each business needs unique WhatsApp number (Twilio verification) | High — Twilio verification takes days |
| Each business needs Turnstile site key (Cloudflare) | Low — one key can be shared |
| Each business needs unique slug | Low — slug is auto-generated from name |
| No batch import for services/hours | Medium — wizard is per-business |
| No template for common business types (dentist, salon) | Medium — each business configured from scratch |

### 18.3 Support Requirements

| Need | Can Nuvora Do It? |
|---|---|
| Owner forgot password | YES — Supabase reset email |
| Owner locked out | YES — founder can reset password |
| WhatsApp not sending | PARTIAL — can check channel config, but no diagnostic |
| AI answering incorrectly | NO — no conversation replay |
| Business needs temporary disable | YES — founder toggle |
| Duplicate customers | PARTIAL — no merge tool |
| Data export | NO — no export feature |

---

## 19. Top 20 Risks

| Rank | Risk | Severity | Category | Fix Priority |
|---|---|---|---|---|
| 1 | `messages` INSERT fails due to missing `business_id` column | CRITICAL | Database | P0 |
| 2 | `services` `is_active` queries fail at runtime | CRITICAL | Database | P0 |
| 3 | `notifications` table doesn't exist — all notifications fail | CRITICAL | Database | P0 |
| 4 | AI books without availability check → double booking | CRITICAL | Booking | P0 |
| 5 | WhatsApp status callback is unauthenticated (spoofable) | CRITICAL | Security | P0 |
| 6 | Meta webhook verify token bypass | CRITICAL | Security | P0 |
| 7 | AI books without customer confirmation | HIGH | AI | P0 |
| 8 | No business hours validation on LLM-provided times | HIGH | AI | P1 |
| 9 | Disabled businesses can still use WhatsApp | HIGH | Security | P1 |
| 10 | Twilio auth tokens stored in plaintext in DB | HIGH | Security | P1 |
| 11 | No CI/CD pipeline — every push to main deploys | HIGH | Deployment | P1 |
| 12 | Sentry DSN not set — errors silently swallowed | HIGH | Observability | P1 |
| 13 | Frontend API URL points to old Render service | HIGH | Deployment | P1 |
| 14 | No conversation viewer for owners | HIGH | UX | P1 |
| 15 | WhatsApp recovery channel is stub | HIGH | WhatsApp | P1 |
| 16 | Cancellation runs without confirmation | HIGH | AI | P1 |
| 17 | Most tables have no non-PK indexes | HIGH | Performance | P1 |
| 18 | No LLM cost/token tracking | HIGH | Observability | P2 |
| 19 | No lead deduplication by phone across channels | MEDIUM | Data | P2 |
| 20 | `updated_at` trigger never attached to any table | MEDIUM | Database | P2 |

---

## 20. Top 20 Improvements

### P0: Blocker Fixes (Immediate)

| # | Improvement | Effort | Area |
|---|---|---|---|
| 1 | Run schema drift migration: add `business_id` to `messages`, `is_active` to `services`, `status` to `businesses`, `changed_by` to `lifecycle_events`, create `notifications` table | 1 day | Database |
| 2 | Add `'completed'` to `appointment_status` enum | 1 hour | Database |
| 3 | Add availability check to `bookingNode` before `appointmentRepository.create()` | 2 hours | Booking |
| 4 | Add Twilio signature validation to status callback webhook | 2 hours | Security |
| 5 | Fix Meta verify token bypass | 1 hour | Security |
| 6 | Remove auto-booking prompt instruction — require `action: 'confirm'` step | 2 hours | AI |
| 7 | Add business hours validation to `isValidFutureDateTime` | 2 hours | AI |

### P1: High Priority (Before 10-Business Pilot)

| # | Improvement | Effort | Area |
|---|---|---|---|
| 8 | Add disabled-business check to WhatsApp webhook handler | 1 hour | WhatsApp |
| 9 | Add critical missing indexes (migration) | 1 day | Database |
| 10 | Set up Sentry DSN in all environments | 1 hour | Observability |
| 11 | Fix `NEXT_PUBLIC_API_URL` to point to `api.nuvoraos.app` | 10 min | Deployment |
| 12 | Add conversation history viewer to admin dashboard | 2 days | UX |
| 13 | Implement WhatsApp recovery channel | 1 day | WhatsApp |
| 14 | Add cancellation confirmation step in agent | 2 hours | AI |
| 15 | Add `updated_at` trigger to all tables | 2 hours | Database |
| 16 | Encrypt Twilio credentials at rest | 1 day | Security |

### P2: Medium Priority (Pilot Monitoring Phase)

| # | Improvement | Effort | Area |
|---|---|---|---|
| 17 | Add LLM token/cost tracking per conversation | 2 days | Observability |
| 18 | Add lead deduplication with UNIQUE on `(business_id, phone)` | 1 day | Data |
| 19 | Add rate limiting for chat endpoint per-customer | 1 day | Security |
| 20 | Add booking confirmation auto-action (AI confirms appointment) | 1 day | Booking |

---

## 21. Pilot Readiness Verdict

**NOT READY FOR PILOT**

### What's Working (Can Pilot After Fixes)

- ✅ Customer-facing pages (landing, services, booking, contact)
- ✅ Admin dashboard and settings (after `is_active` fix)
- ✅ Founder ops pages (businesses, users, onboarding wizard)
- ✅ Tenant isolation (business-scoped queries, Supabase RLS)
- ✅ WhatsApp inbound/outbound flow (after status callback fix)
- ✅ AI booking workflow (deterministic state machine, field-level merge, greeting recovery)
- ✅ Direct-answer extraction (`lastAskedField` tracking)
- ✅ Timezone handling (zero-dependency `Intl.DateTimeFormat`)
- ✅ Delivery tracking (`message_deliveries` table)
- ✅ Lead lifecycle tracking (`customer_lifecycle_events`)

### What Must Be Fixed Before Any Customer Onboard

1. **4 schema drifts** that cause runtime failures (`messages.business_id`, `services.is_active`, `notifications` table, `businesses.status`)
2. **Double booking** in AI agent path (no availability check)
3. **WhatsApp status callback spoofing** (no Twilio signature validation)
4. **AI auto-books without confirmation** (prompt instructs LLM to skip confirmation)
5. **No business hours validation** (AI can book 3 AM on Sunday)

### Path to Limited Pilot (1-2 controlled businesses)

| Phase | Duration | Activities |
|---|---|---|
| Hotfix Sprint | 3-5 days | Fix P0 blockers (schema drifts, double booking, WhatsApp security, AI confirmation, hours validation) |
| Internal Pilot | 1 week | Founder + 1 test business using WhatsApp + Website Chat |
| Limited Pilot | 2 weeks | 2-3 trusted businesses, daily monitoring, bug fixes |
| Open Pilot | Ongoing | 10+ businesses, with monitoring and support in place |

### Recommended Verdict for Right Now

```
READY FOR LIMITED PILOT:  NO  (4 blocking P0 issues)
READY FOR INTERNAL TEST:  YES (with fixed schema drifts)
NOT READY FOR PILOT:      YES (current state)
```
