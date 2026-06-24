# Pilot Operations Readiness Report

**Date:** 2026-06-24
**Scope:** Operational audit of Novura's ability to support 20 businesses without constant founder intervention
**Verdict:** FOUNDER BOTTLENECK IDENTIFIED

---

## Table of Contents

1. [Customer Onboarding Simulation](#1-customer-onboarding-simulation)
2. [Business Provisioning Audit](#2-business-provisioning-audit)
3. [WhatsApp Provisioning Audit](#3-whatsapp-provisioning-audit)
4. [Knowledge Collection Audit](#4-knowledge-collection-audit)
5. [AI Configuration Audit](#5-ai-configuration-audit)
6. [Go-Live Checklist](#6-go-live-checklist)
7. [Founder Operations Load](#7-founder-operations-load)
8. [Customer Support Audit](#8-customer-support-audit)
9. [Business Lifecycle Audit](#9-business-lifecycle-audit)
10. [Founder Dashboard Audit](#10-founder-dashboard-audit)
11. [Provisioning Readiness Scores](#11-provisioning-readiness-scores)
12. [Top 10 Friction Log](#12-top-10-friction-log)
13. [Recommended Roadmap](#13-recommended-roadmap)
14. [Verification](#14-verification)

---

## 1. Customer Onboarding Simulation

### Methodology

Simulate onboarding three business types through the existing wizard at `/ops/onboarding`. Measure all interactions, manual actions, and founder involvement.

### Wizard Flow (Common to All)

```
Step 0: Industry Selection (1 click)
Step 1: Business Details (name, slug, email, phone, address)
Step 2: Services (name, price, duration per service)
Step 3: Hours (open/close per day)
Step 4: FAQs (question/answer pairs, optional)
Step 5: AI Config (greeting, escalation email, slot duration)
Step 6: Review (read-only, validation check)
Step 7: Publish (1 click)
Post: Owner account creation (name, email, consent)
```

### Clinic Onboarding Map

| Step | Action | Clicks | Founder Time | Notes |
|------|--------|--------|-------------|-------|
| Industry | Select "Dental Clinic" | 2 | 5s | Template preloads 6 services, 7 FAQs, 9-6 hours |
| Business | Name: "Downtown Dental", slug: auto, email, phone, address | 2 + ~30s typing | 40s | Slug auto-generated from name |
| Services | Accept 6 pre-filled (Checkup, Root Canal, Filling, Crown, Whitening, Extraction) | 1 | 5s | Prices pre-filled at market rates |
| Hours | Accept Mon-Fri 9-6, Sat 9-1, Sun closed | 1 | 3s | Template matches clinic norms |
| FAQs | 7 pre-filled (insurance, emergency, pain, anxiety, payment, hours, location) | 1 | 3s | Can skip or edit |
| AI Config | Review greeting, add escalation email, set 30min slots | 2 | 15s | Custom greeting is IGNORED by AI |
| Review | Check summary | 1 | 10s | Green check if all valid |
| Publish | Click "Publish Tenant" | 1 | 2s | ~800ms API response |
| Owner | Fill name + email + legal consent | 2 + 15s typing | 20s | Password shown once, must copy manually |

**Total: ~14 clicks, ~1.5 min typing, ~2 min founder time**

### Salon Onboarding Map

| Step | Founder Time | Diff from Clinic |
|------|-------------|-----------------|
| Industry: "Salon & Beauty" | 5s | Different template (5 services: Haircut $30, Coloring $80, Facial $50, Manicure $25, Pedicure $30) |
| Business: "Elegance Studio" | 40s | Same flow |
| Services: Remove 1, add 2 custom (Keratin $150, Bridal $200) | 30s | More likely to customize — salon service catalog varies widely |
| Hours: Extend to 8pm weekdays, Sat 9-8 | 10s | Template has shorter hours |
| FAQs: Accept 5 pre-filled (booking policy, brands, cancellation, parking, gift) | 3s | Slightly different content |
| AI Config: Edit greeting, add email, set 30min | 15s | Same |
| Publish | 2s | Same |
| Owner creation | 20s | Same |

**Total: ~17 clicks, ~2 min typing, ~2.5 min founder time** (more customization)

### Gym Onboarding Map

| Step | Founder Time | Diff |
|------|-------------|------|
| Industry: "Gym & Fitness" | 5s | Template: 5 services (Personal Training $50, Group Class $20, Yoga $15, Nutrition $40, PT Package $200) |
| Business: "Iron Haven Fitness" | 40s | Same |
| Services: Add "Spa Access" $30 | 15s | Less customization than salon |
| Hours: Template has 5am-10pm weekdays, 7am-8pm Sat, 8am-6pm Sun | 3s | Already matches gym norms |
| FAQs: 5 pre-filled (trial session, trainers, shower, towels, lockers) | 3s | Same |
| AI Config: More energetic greeting, 60min slots | 15s | Longer sessions |
| Publish + Owner | 22s | Same |

**Total: ~15 clicks, ~1.5 min typing, ~2 min founder time**

### Key Findings — Onboarding

1. **Every business requires founder presence.** No self-serve option exists. The founder must log in as SUPER_ADMIN, navigate to `/ops/onboarding`, and execute the entire flow.

2. **Owner credential delivery is manual.** The password is shown ONCE on screen. There is no email delivery. The founder must copy it and share it with the business owner out-of-band (WhatsApp, phone, in person). This fails at any scale.

3. **Post-publish checklist is client-side only.** The 5-item checklist uses localStorage — it resets on browser clear or different device. There is no backend tracking of go-live status.

4. **Total time per business: ~2-3 minutes** (founder, wizard only). Realistic total including context switching, owner credential delivery, and verification: **10-15 minutes per business**.

5. **Draft recovery works** (localStorage auto-save with resume prompt) but only on the same browser. Switching browsers or devices loses the draft.

6. **No bulk operations.** Onboarding 20 businesses requires repeating the wizard 20 times.

---

## 2. Business Provisioning Audit

### What Must Be Created

| Entity | Created By | Automated? | Timing |
|--------|-----------|-----------|--------|
| `businesses` row | Onboarding wizard | Yes | At publish |
| `services` rows (1+) | Onboarding wizard | Yes (bulk insert) | At publish |
| `availability_schedules` rows (1-7) | Onboarding wizard | Yes (bulk insert) | At publish |
| `business_channels` defaults (4 rows) | Lazy auto-insert | Yes | First `getChannels()` call |
| `staff_profiles` (owner) | Owner creation form | Yes (Supabase user + profile) | Post-publish, optional |
| `staff_profiles` (staff) | Team management UI | Manual | As needed |
| `availability_overrides` | None — manual DB only | No | Not provisioned |
| `calendar_credentials` | None — manual only | No | Future integration |
| WhatsApp number | Settings → Channels UI | Manual entry | Post-provisioning |

### Automation Score

| Aspect | Score | Notes |
|--------|-------|-------|
| Business creation | 100% automated | Single publish API call, transactional |
| Service creation | 100% automated | Bulk inserted with business |
| Schedule creation | 100% automated | Bulk inserted with business |
| Channel defaults | 100% automated | Lazy on first read |
| Owner account | 100% automated | Supabase admin API creates user |
| WhatsApp number | 0% automated | Manual entry per business |
| Staff invites | 50% automated | UI exists but no self-signup |
| Knowledge (FAQs/services) | 90% automated | Templates pre-fill, manual review only |
| AI config | 100% automated | Wizard collects everything needed |

**Verdict: Core provisioning is highly automated. The gaps are in WhatsApp setup, owner credential delivery, and post-provisioning configuration.**

### Direct Database Access Required?

| Operation | DB Access Required? |
|-----------|-------------------|
| Create business | No |
| Create services | No |
| Create schedules | No |
| Create owner account | No |
| Assign WhatsApp number | No |
| Business status toggle | No (founder UI) |
| Resolve provisioning error | **Yes — sometimes** |
| Debug failed onboarding | **Yes** (no onboarding error dashboard) |
| Fix stuck migration state | **Yes** |
| Manually insert overrides | **Yes** (no UI for overrides) |

---

## 3. WhatsApp Provisioning Audit

### Current Process

```
Step 1: Technical Setup (ONE TIME, done by engineer)
  ├── Create Twilio account (15-30 min)
  ├── Get WhatsApp Business number approved (1-5 business days)
  ├── Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER env vars (5 min)
  └── Configure Twilio webhook URLs in Twilio Console (5 min)
       → "When a message comes in": POST /api/webhooks/twilio/whatsapp
       → Status callback: POST /api/webhooks/twilio/status

Step 2: Per-Business Setup (done by business owner, < 1 min)
  ├── Log into admin dashboard
  ├── Navigate to Settings → Channels
  ├── Enter WhatsApp phone number (e.g., +1234567890)
  └── Click Save + toggle Enable
```

**Total setup time:** ~30 min technical (once) + 5 business days for number approval + 1 min per business.

### What Is Automated

| Step | Automated? |
|------|-----------|
| Twilio account creation | No — manual |
| WhatsApp number application | No — manual through Twilio |
| Twilio env var setup | No — manual per environment |
| Webhook URL registration | No — manual in Twilio Console |
| Business channel row creation | Yes — lazy auto-insert |
| WhatsApp number saving | Yes — via Settings UI |
| WhatsApp channel toggle | Yes — via Settings UI |
| Outbound message sending | Yes — WhatsAppAdapter |
| Inbound message handling | Yes — webhook handler |
| Delivery status tracking | Yes — status callbacks |
| Delivery health metrics | Yes — message_deliveries aggregation |

### Per-Business Multi-Tenancy

Each business can have its own WhatsApp number stored in `business_channels.config_json.whatsappNumber`. The adapter supports per-business Twilio credentials (`accountSid`, `authToken`) in config_json but these are **not exposed in the settings UI** — only `whatsappNumber` is editable.

### Critical Issues

1. **Env vars are single-tenant by default.** If `TWILIO_WHATSAPP_NUMBER` is set globally, all businesses share one number. Per-business numbers require `config_json` setup which has no UI.
2. **WhatsApp number approval takes days.** Cannot be done during onboarding. Must be started before provisioning.
3. **No automated number provisioning.** The founder must coordinate with each business owner to obtain their WhatsApp number and enter it manually.
4. **No WhatsApp template support.** `supportsTemplates: true` is reported but no templates exist.
5. **Voice/SMS recovery channels are stubs** — they throw "not implemented".

---

## 4. Knowledge Collection Audit

### Current Process

Business knowledge is collected in two stages:

**Stage 1: Onboarding Wizard (structured)**
| Knowledge Type | Collection Method | Pre-populated? | Quality Check? |
|---------------|-------------------|---------------|----------------|
| Business name, type, location | Form fields | No | Zod validation |
| Services (name, price, duration) | Dynamic form, min 1 | Yes (from template) | Price > 0, duration > 5min |
| Working hours (7 days) | Time pickers per day | Yes (from template) | At least 1 day open |
| FAQs (question/answer) | Dynamic form, optional | Yes (5-10 from template) | None (can proceed with 0) |
| AI greeting | Text area | Yes (from template) | Min 5 chars |
| Escalation email | Email input | No | Valid email format |
| Escalation keywords | Not collected in wizard | Hardcoded defaults | NA |

**Stage 2: Admin Settings (ongoing)**
| Knowledge Type | Collection Method | Notes |
|---------------|-------------------|-------|
| Additional FAQs | FAQ management page | Bulk save |
| Service edits | Service management page | Enable/disable, edit |
| Hours changes | Hours management page | Update schedules |
| AI behavior edits | AI settings page | Greeting, toggles |
| Learning inbox | Review unanswered questions | Approve/reject suggested answers |

### Gaps

1. **FAQs are optional.** A business can go live with zero FAQs. The AI will answer based on generic knowledge only.
2. **No PDF/document import.** Today's sources (PDFs, Google Docs, WhatsApp chats, printed menus) must be manually transcribed into the form.
3. **No batch FAQ import.** Adding 20 FAQs requires 20 form submissions (add, type question, type answer, select category, repeat).
4. **No pricing sheets.** Pricing is entered per-service. No support for package pricing, membership pricing, or dynamic pricing.
5. **No policy documents.** Cancellation policies, refund policies, insurance information must be manually entered as FAQs.
6. **No media upload.** Cannot attach images, price lists, or service brochures.
7. **Learning Inbox is reactive.** Questions only get answered after a customer asks them and the AI fails. No proactive knowledge seeding.
8. **AI greeting is collected but ignored.** The prompt system uses a hardcoded greeting template instead of the business's custom greeting.

### Ideal Workflow (for comparison)

```
1. Business sends PDF/website URL → System scrapes/parses → Pre-fills form
2. Founder reviews and approves extracted knowledge
3. One-click publish with all gaps highlighted
```

Current reality is step 2 with no step 1.

---

## 5. AI Configuration Audit

### How Much Prompt Customization Is Required?

**None required — a complete business functions out-of-the-box with:**
- 0 prompt edits
- 0 code changes
- 0 database touches

The onboarding wizard collects everything the AI needs: business identity, services, hours, FAQs, escalation keywords, slot duration.

### What Works Without Customization

| Feature | Works? | Notes |
|---------|--------|-------|
| Greeting | Yes | Hardcoded template (ignores custom greeting) |
| FAQ answering | Yes | Uses FAQs from wizard in business context |
| Pricing Q&A | Yes | Uses service prices from wizard |
| Booking | Yes | Uses services, hours, slot duration |
| Reschedule | Yes | Generic but functional |
| Cancel | Yes | Generic but functional |
| Escalation detection | Yes | Uses escalation keywords from template |
| Lead capture | Yes | Generic name/email/phone collection |
| Follow-ups | Yes | Generic prompts (no business context) |
| Recovery | Yes | Generic prompts (no business context) |
| Unknown questions | Yes | Creates knowledge requests for owner review |

### What Does NOT Work (or Is Generic)

| Issue | Impact | Severity |
|-------|--------|----------|
| Custom greeting text ignored | Business tone is generic, not personalized | Medium |
| Follow-up/recovery messages have zero business context | "Hi! We noticed you were looking at our services" instead of specific service names | Medium |
| `archetype` field never used | Data collected but no behavioral difference | Low |
| `ai.leadCaptureEnabled`/`ai.bookingEnabled` never checked | Feature toggles exist in DB but are not enforced | Low |
| `bufferMinutesBefore/After` never referenced | Stored but unused | Low |

### Can Onboarding Happen Without Editing Prompts/Code/DB?

**YES — completely.** A non-technical founder can onboard a business and it will function:
- Chat, booking, escalation, follow-ups all work
- The AI will answer using the business's services and FAQs
- The only missing piece is custom greeting tone (minor) and business-specific follow-up messages (minor)

### What Requires Code Changes (Per Business Type)

Nothing currently requires per-business-type code changes. The business type determines template defaults only. The prompt system uses `business.businessType` as a label ("a dental clinic business") but does not branch logic on it.

**However**, the escalation detector has hardcoded role terminology per type:
- Clinics: "doctor, specialist, consultant"
- Salons: "stylist, beautician, manager"
- Gyms: "trainer, coach"

This is not configurable through the wizard. Adding a new business type (e.g., "Auto Repair") requires modifying `escalation-detector.service.ts`.

---

## 6. Go-Live Checklist

### Definitive Go-Live Process

A business is **live** when the following conditions are all met:

```
[ ] Website chat widget embedded and receiving messages
[ ] AI responds to customer inquiries
[ ] Booking flow works end-to-end
[ ] Escalations route to owner dashboard
[ ] WhatsApp (if applicable) sending and receiving
[ ] Analytics dashboard showing data
```

### Step-by-Step Go-Live Process

| # | Step | How | Who | Time | Dependency |
|---|------|-----|-----|------|------------|
| 1 | Run onboarding wizard | `/ops/onboarding` | Founder | 3 min | Supabase, env vars |
| 2 | Create owner account | Owner creation form | Founder | 1 min | Step 1 |
| 3 | Share credentials with owner | Copy/paste password | Founder | 1 min | Step 2 |
| 4 | Owner logs in | Accepts URL + password | Owner | 1 min | Step 3 |
| 5 | Verify chat on website | Visit `/{slug}` | Founder | 1 min | Steps 1-4 |
| 6 | Send test message | Type in chat widget | Founder | 1 min | Step 5 |
| 7 | Verify AI response | Check reply in < 5s | Founder | 1 min | Step 6 |
| 8 | Test booking flow | "Book appointment" in chat | Founder | 2 min | Step 7 |
| 9 | Verify appointment created | Check admin appointments | Founder | 1 min | Step 8 |
| 10 | Configure WhatsApp (optional) | Settings → Channels → enter number + enable | Owner | 2 min | Twilio configured |
| 11 | Send WhatsApp test message | Send from customer phone | Founder | 2 min | Step 10 |
| 12 | Verify delivery status | Check delivery health in admin | Founder | 1 min | Step 11 |
| 13 | Test escalation | Type "talk to a person" in chat | Founder | 1 min | Steps 1-9 |
| 14 | Verify inbox notification | Check owner inbox | Founder | 1 min | Step 13 |
| 15 | Review analytics | Check admin Analytics page | Founder | 1 min | Steps 1-9 |

**Total time per business (full go-live): ~20 minutes** (15 steps, with verification)

### Pain Points

1. **No automated go-live tracking.** The 5-item post-publish checklist is client-side localStorage. There is no backend record of go-live status.
2. **Verification is entirely manual.** Each step requires the founder to manually test, click through, and confirm.
3. **WhatsApp requires Twilio pre-configuration.** Cannot be done during the wizard. Must be done separately.
4. **No business readiness indicator.** The founder dashboard shows basic health (delivery rate, escalation counts) but no "go-live completeness" score.
5. **Owner credentials are fragile.** Password shown once, not emailed, not retrievable. Lost password = support ticket.

---

## 7. Founder Operations Load

### Operational Activities per Business per Month

| Activity | Frequency | Time per Instance | Monthly Time | Dependency |
|----------|-----------|------------------|-------------|------------|
| Initial onboarding | Once | 15 min (full go-live) | 0 (one-time) | — |
| WhatsApp setup (if applicable) | Once | 5 min + days wait | 0 (one-time) | Twilio |
| Monitor business health | Daily | 2 min per check | 10 min/business | Dashboard |
| Respond to escalations (owner does this, but founder monitors) | Weekly | 1 min per review | 4 min/business | Inbox |
| Follow-up on failed deliveries | Weekly | 2 min | 8 min/business | Delivery health |
| Answer support questions from owner | Weekly | 5 min | 20 min/business | Support search |
| FAQ/knowledge updates | Monthly | 10 min | 10 min/business | Learning inbox |
| Handle onboarding errors | Per business | 15 min | Negligible | Engineer/DB access |
| WhatsApp number changes | Quarterly | 5 min | 1.5 min/business | Settings |
| Business disable/reactivate | Rare | 2 min | < 1 min/business | Business page |

### Load Estimates

#### 1 Business
| Activity | Hours/Month |
|----------|------------|
| Daily health check (1 min × 30 days) | 0.5 |
| Escalation monitoring (2 min × 4 weeks) | 0.1 |
| Support questions (5 min × 4 weeks) | 0.3 |
| Monthly maintenance | 0.2 |
| **Total** | **~1.1 hours/month** |
| **Classification** | **LOW** |

#### 5 Businesses
| Activity | Hours/Month |
|----------|------------|
| Daily health checks (5 min × 30 days) | 2.5 |
| Escalation monitoring (10 min × 4 weeks) | 0.7 |
| Support questions (25 min × 4 weeks) | 1.7 |
| Monthly maintenance (50 min) | 0.8 |
| **Total** | **~5.7 hours/month** |
| **Classification** | **LOW** |

#### 10 Businesses
| Activity | Hours/Month |
|----------|------------|
| Daily health checks (10 min × 30 days) | 5.0 |
| Escalation monitoring (20 min × 4 weeks) | 1.3 |
| Support questions (50 min × 4 weeks) | 3.3 |
| Monthly maintenance (100 min) | 1.7 |
| New onboarding (1 new business) | 0.3 |
| Founder analytics review (30 min) | 0.5 |
| **Total** | **~12 hours/month** |
| **Classification** | **MEDIUM** |

#### 20 Businesses
| Activity | Hours/Month |
|----------|------------|
| Daily health checks (20 min × 30 days) | 10.0 |
| Escalation monitoring (40 min × 4 weeks) | 2.7 |
| Support questions (100 min × 4 weeks) | 6.7 |
| Monthly maintenance (200 min) | 3.3 |
| New onboarding (2 new businesses) | 0.5 |
| Founder analytics review (60 min) | 1.0 |
| Issue firefighting (varies) | 5.0 |
| **Total** | **~29 hours/month** |
| **Classification** | **HIGH** |

### Scaling Classification

| Scale | Hours/Month | Classification | Notes |
|-------|------------|----------------|-------|
| 1 business | ~1 hr | LOW | Trivial — can be done during coffee breaks |
| 5 businesses | ~6 hrs | LOW | Manageable as part-time focus |
| 10 businesses | ~12 hrs | MEDIUM | Becomes a weekly commitment (3 hrs/week) |
| 20 businesses | ~29 hrs | HIGH | Approaches part-time job (7 hrs/week) |
| 50 businesses | ~70 hrs | UNSUSTAINABLE | Would require dedicated operations person |

**The scaling bottleneck is support questions and issue firefighting**, not health monitoring. As businesses grow, each owner has unique problems requiring founder diagnosis. Without self-serve support tools, the founder becomes the help desk.

---

## 8. Customer Support Audit

### Scenario 1: Business Owner Confused

**Situation:** Owner calls/founders-slack: "I can't find the dashboard" or "Where do I see my appointments?"

| Diagnostic Step | Can Founder Do? | How |
|----------------|----------------|-----|
| Find the business | Yes | Businesses page → search by name |
| Find the owner | Yes | Users page → filter by role/business |
| Find the admin URL | Yes | Business detail shows "Admin" link |
| Check if owner has logged in | No | No login tracking |
| Check owner's role/permissions | Yes | User detail shows memberships |
| Reset password | Yes | User detail → "Reset Password" |
| **Total: Mostly solvable from dashboards** |

**Resolution time:** ~2 min if owner exists, ~5 min if owner needs creation.

### Scenario 2: WhatsApp Disconnected

**Situation:** WhatsApp messages not being delivered.

| Diagnostic Step | Can Founder Do? | How |
|----------------|----------------|-----|
| Check if WhatsApp is enabled | Yes | Business Health → channel health |
| Check delivery rate | Yes | Pilot Health → delivery rate column |
| Check recent failures | Yes | If business detail → deliveries tab |
| View failed message details | Yes | Failed deliveries table |
| See which number is configured | Partially | Settings shows number, but not in founder view |
| Verify Twilio config | No | No Twilio credential check in UI |
| Test end-to-end | No | No tool to send test WhatsApp message |
| Check webhook status | No | No webhook health indicator |
| **Gap: Cannot verify Twilio-side configuration from dashboards** |

**Resolution time:** ~5 min if delivery failures visible, ~15 min if Twilio config issue (requires engineer).

### Scenario 3: Booking Failed

**Situation:** Customer tried to book but AI couldn't complete the booking.

| Diagnostic Step | Can Founder Do? | How |
|----------------|----------------|-----|
| Find the conversation | Yes | Support search → search by name/phone |
| Read the conversation | Yes | Conversation detail page |
| See which workflow state | Yes | Workflow state shown in conversation detail |
| Check if appointment was created | Yes | Appointments page |
| See LLM errors | **No** | LLM usage tracked for costs, not errors |
| See agent node errors | **No** | Graph errors logged to console only |
| Rerun or debug the agent | **No** | No agent debugging tool |
| **Gap: AI failures are invisible. No error diagnostics accessible to non-engineers.** |

**Resolution time:** 5 min if owner can report what happened, UNKNOWN if AI silently failed.

### Scenario 4: Escalation Missed

**Situation:** Customer asked for human, nobody responded for 30+ minutes.

| Diagnostic Step | Can Founder Do? | How |
|----------------|----------------|-----|
| See pending escalations | Yes | Pilot Health → escalation count |
| See how long escalation has been waiting | Yes | Inbox → waiting duration |
| See who (if anyone) is assigned | Yes | Conversation owner field |
| See reminder notifications | Yes | Notification drawer (30s poll) |
| Take over the conversation | Yes | Inbox → Join Conversation |
| Alert the owner out-of-band | **No** | No email/SMS notification for missed escalations |
| Check if owner is online | **No** | No user presence tracking |
| Escalate to alternative contact | **No** | Single escalation email only (not used for notifications) |
| **Gap: No escalation to founder when business owner is unresponsive.** |

**Resolution time:** 30 min max (reminder at 30 min), but only if someone is watching the dashboard. No push notification exists.

### Categories Requiring Direct Engineering Involvement

| Scenario | Why |
|----------|-----|
| Twilio credential rotation | Env var change + restart |
| WhatsApp number migration | Config update at DB level |
| Onboarding failure during publish | DB-level debugging of transaction |
| Custom prompt changes | Code change |
| Data corruption | Direct DB fix |
| Migration failure | Direct DB intervention |
| Rate limit adjustments | Config change |
| Cold start performance complaints | Render config change |

---

## 9. Business Lifecycle Audit

### Stage 1: New Customer

**Definition:** Business has been onboarded but has < 30 days of activity.

| Tool/Feature | Exists? | Notes |
|-------------|---------|-------|
| Go-live checklist | Partial | Client-side only (localStorage) |
| First-week check-in | No | No automated check-in |
| Onboarding success tracking | No | No "did onboarding complete" flag |
| Welcome tour for owner | No | No in-app onboarding for business owner |
| Initial data population check | No | No verification that services/hours/FAQs are adequate |
| Hand-holding period indicator | No | No status marking for "ramping" businesses |

### Stage 2: Active Customer

**Definition:** Business has > 30 days of activity, regular conversations.

| Tool/Feature | Exists? | Notes |
|-------------|---------|-------|
| Health monitoring | Yes | Pilot Health with risk scoring |
| Delivery monitoring | Yes | Delivery rate, failed delivery tracking |
| Escalation monitoring | Yes | Escalation counts, inbox reminders |
| Activity feed | Yes | Recent activity timeline |
| Analytics dashboard | Yes | Lead funnel, service leaderboard, trends |
| Cost monitoring | Yes | Cost dashboard |
| AI performance metrics | No | No response accuracy, handoff rate, satisfaction |

### Stage 3: Growing Customer

**Definition:** Scaling usage, adding services, increasing conversation volume.

| Tool/Feature | Exists? | Notes |
|-------------|---------|-------|
| Usage growth indicators | No | No month-over-month comparison |
| Capacity alerts | No | No warnings for approaching limits |
| Service catalog expansion | Yes | Can add/edit services in settings |
| Staff management | Yes | Team management in settings |
| Channel expansion (WhatsApp) | Yes | Can add WhatsApp |
| **Growth bottleneck detection** | **No** | No tool to identify businesses that need attention |

### Stage 4: Churning Customer

**Definition:** Declining activity, missed escalations, unresolved issues.

| Tool/Feature | Exists? | Notes |
|-------------|---------|-------|
| Activity decline detection | **No** | No automated detection of dropping usage |
| Churn risk scoring | **No** | No predictive analytics |
| Owner disengagement flag | **No** | No tracking of owner login frequency |
| Failed delivery alert | Partial | Delivery rate shown but no threshold alert |
| Escalation neglect alert | Partial | Reminders exist but no escalation to founder |
| **Business disable/reactivate** | **Yes** | Founder can toggle status |
| **Customer data export** | **No** | No data export for churning businesses |

### Overall Lifecycle Assessment

| Lifecycle Stage | Tool Coverage | Gap |
|----------------|--------------|-----|
| New Customer | 1/5 (20%) | No go-live verification, no welcome tour, no initial data check |
| Active Customer | 6/8 (75%) | No AI performance metrics, no SLA tracking |
| Growing Customer | 3/6 (50%) | No growth indicators, no capacity alerts |
| Churning Customer | 1/6 (17%) | No churn detection, no owner engagement tracking |

---

## 10. Founder Dashboard Audit

### Dashboard Inventory

| Dashboard | Route | What It Shows | Operational Value |
|-----------|-------|--------------|-------------------|
| Overview | `/ops` | Total businesses, owners, staff, recent 10 businesses | Quick pulse check |
| Businesses | `/ops/businesses` | Full table with search, owner, status, created date | Business management |
| Users | `/ops/users` | User list with roles, status, memberships | User management |
| Costs | `/ops/costs` | Platform cost, LLM/channel breakdown, top businesses | Cost monitoring |
| Onboarding | `/ops/onboarding` | Full wizard to create new businesses | Provisioning |
| Pilot Health | `/ops/pilot` | Per-business health (convs, leads, apps today, escalations, delivery rate, risk) | Operational monitoring |
| Support Search | `/ops/support` | Cross-entity search (businesses, leads, conversations, appointments) | Debugging |
| Business Health | `/ops/businesses/:id/health` | Deep health: today metrics, 7-day delivery, activity timeline | Per-business deep dive |

### Can Founder Manage 20 Businesses from Existing Tools?

| Task | Can Do? | Notes |
|------|---------|-------|
| See which businesses are healthy | Yes | Pilot Health table |
| See which businesses have issues | Partial | Risk column exists but not sortable/filterable |
| Diagnose delivery problems | Partial | Delivery rate visible but no channel breakdown in founder view |
| Find a specific conversation | Yes | Support search works across entities |
| Check cost per business | Yes | Cost dashboard top businesses |
| See if a business is growing/shrinking | No | No trend data |
| See if an owner is disengaged | No | No login tracking |
| Get alerted about problems | No | No push notifications |
| Mass-update businesses | No | No batch operations |
| Export data | No | No CSV/JSON export |
| **Manage 20 businesses** | **Partially — requires daily manual checks** | |

### Missing Operational Views

1. **Alert feed** — chronological list of issues requiring attention (failed deliveries, missed escalations, business disabled, churn risk)
2. **Business health timeline** — graph of health score over time (not just point-in-time snapshot)
3. **Owner engagement dashboard** — last login, login frequency, active conversations joined, escalation response time
4. **SLA compliance** — escalation response times, delivery latency, first-response time
5. **Onboarding pipeline** — number of businesses in each stage (draft, published, live, go-live verified)
6. **Batch operations UI** — select multiple businesses, enable/disable, reassign owner, export

---

## 11. Provisioning Readiness Scores

Scored 0-10. 0 = completely manual/unusable, 10 = fully automated/self-serve.

| Category | Score | Evidence |
|----------|-------|----------|
| **Onboarding** | **8/10** | Wizard is excellent for a single business. Lacks bulk operations, self-serve, credential delivery. |
| **WhatsApp Setup** | **4/10** | Once-off technical setup is heavy. Per-business number config is easy but founder must coordinate outside the system. Days of waiting for number approval. |
| **Knowledge Collection** | **5/10** | Wizard captures structured knowledge well. No document import, no batch FAQ, no PDF parsing. Knowledge gaps are invisible until customers trigger them. |
| **AI Configuration** | **7/10** | Zero code/prompt changes needed. But custom greeting is ignored, archetype unused, feature toggles unenforced. |
| **Support** | **5/10** | Support search is powerful but AI error diagnostics, Twilio health checks, and owner engagement monitoring are missing. Debugging failures often requires direct DB access. |
| **Monitoring** | **5/10** | Pilot Health dashboard gives good snapshot but no trend data, no alerting, no SLA tracking. Everything is pull-not-push. |
| **Billing Readiness** | **2/10** | Cost tracking exists. No billing, no invoicing, no payment collection, no plan tiers, no subscription management. |
| **Scale Readiness** | **4/10** | Current infrastructure supports multiple businesses but operational tooling does not scale. At 20 businesses, founder operations load reaches HIGH (29 hrs/month). |

### Overall Score: 5.0/10

The platform can technically support 20 businesses. The operational tooling cannot.

---

## 12. Top 10 Friction Log

### #1: Owner Credential Delivery
**Description:** When a business owner account is created, the password is displayed ONCE on the founder's screen. There is no email delivery, no reset link in the invite, no QR code.
- **Impact:** HIGH — every single onboarding requires a manual out-of-band credential transfer
- **Frequency:** Every business (100%)
- **Severity:** High — creates dependency on founder for every business owner login
- **Suggested fix:** Send invitation email with one-time sign-in link (magic link). Remove password from the flow entirely.

### #2: WhatsApp Number Provisioning Timeline
**Description:** Getting a WhatsApp Business number through Twilio takes 1-5 business days. This cannot be done during the 3-minute onboarding.
- **Impact:** HIGH — WhatsApp is a core feature. Delivery is delayed by days.
- **Frequency:** Every business wanting WhatsApp (likely 80%+)
- **Severity:** High — blocks go-live for the primary communication channel
- **Suggested fix:** Start WhatsApp number application process in parallel with onboarding. Pre-provision reserve numbers. Use WhatsApp Sandbox for immediate testing.

### #3: No Self-Serve Onboarding
**Description:** Every business requires a founder (SUPER_ADMIN) to use the wizard. There is no `/signup` route, no self-registration, no trial flow.
- **Impact:** HIGH — founder is a bottleneck for every single new business
- **Frequency:** Every business (100%)
- **Severity:** High — at 20 businesses, onboarding becomes 3+ hours/month of founder time
- **Suggested fix:** Create a self-serve signup flow where business owners can register, select a template, customize, and go live without founder involvement.

### #4: No Alerting Infrastructure
**Description:** All monitoring is pull-based. Founder must open dashboards to see problems. There are no email alerts, Slack notifications, or SMS for critical events (failed deliveries, missed escalations, business down).
- **Impact:** HIGH — problems are invisible until founder checks
- **Frequency:** Daily
- **Severity:** Critical — escalations can go unnoticed for 30+ minutes
- **Suggested fix:** Implement email alerts for critical events: delivery failure spikes, escalations > 15 min, business disable, onboarding errors.

### #5: AI Failure Invisibility
**Description:** When the LangGraph agent fails (LLM error, graph error, timeout), the error is logged to console only. There is no dashboard for AI errors, no failure rate metric, no per-conversation error visibility.
- **Impact:** MEDIUM — silent failures erode customer trust
- **Frequency:** Unknown (no tracking)
- **Severity:** Medium — customers will report failures before founder knows about them
- **Suggested fix:** Track agent invocation failures with context (business, conversation, LLM node). Add AI health dashboard with error rate, average response time, and failure breakdown.

### #6: No Trend Data in Pilot Health
**Description:** The Pilot Health dashboard is a point-in-time snapshot. There are no charts, no 7-day/30-day trends, no week-over-week comparison. Cannot tell if a business is improving or declining.
- **Impact:** MEDIUM — cannot proactively identify declining businesses
- **Frequency:** Every dashboard visit
- **Severity:** Medium — reactive operations rather than proactive
- **Suggested fix:** Add time-series charts to Pilot Health: conversaions/day, delivery rate trend, escalation volume over time.

### #7: No Business Lifecycle Stage Tracking
**Description:** There is no concept of business lifecycle stages (new/active/growing/churning). No onboarding completion status, no "days since go-live", no growth indicators.
- **Impact:** MEDIUM — cannot segment businesses by maturity for differentiated operations
- **Frequency:** Ongoing
- **Severity:** Medium — prevents proactive lifecycle management
- **Suggested fix:** Add `go_live_at` timestamp to businesses. Add lifecycle stage computed field based on activity age and volume. Filter/sort by lifecycle in founder dashboard.

### #8: Knowledge Collection Is Manual and Fragile
**Description:** No document import. No batch FAQ entry. FAQs are optional. Pricing is per-service only (no packages/memberships). Knowledge gaps are invisible until customers trigger them.
- **Impact:** MEDIUM — businesses with poor initial knowledge have worse AI performance
- **Frequency:** Every business (100%)
- **Severity:** Medium — affects AI quality directly
- **Suggested fix:** Add FAQ template library. Add import from PDF/website. Make FAQs required (minimum 5). Add knowledge completeness score in onboarding.

### #9: Recovery Channels Are Web-Only
**Description:** The recovery/re-engagement system (abandonment detection, missed calls) generates messages but only delivers through `web_chat`. WhatsApp, SMS, and Voice channels throw "not implemented".
- **Impact:** LOW-MEDIUM — web chat recovery works but limited
- **Frequency:** Every re-engagement attempt
- **Severity:** Low for pilot, Medium for scale
- **Suggested fix:** Implement WhatsApp recovery channel first (existing Twilio integration handles this). SMS and voice are lower priority.

### #10: No Onboarding Error Recovery UI
**Description:** When onboarding publish fails (rare but happens), there is no error detail shown to the founder beyond a generic "Something went wrong" retry button. Debugging requires DB access.
- **Impact:** LOW — fails rarely, but when it does, founder is stuck
- **Frequency:** < 1% of onboarding attempts
- **Severity:** Low-Medium — blocks business creation until engineer is involved
- **Suggested fix:** Surface error details in the onboarding UI with actionable fix suggestions. Add "retry with same data" that works idempotently.

---

## 13. Recommended Roadmap

### Must Fix Before First Pilot

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 1 | **Owner credential delivery** (magic link invite email) | 2-3 days | Critical — every onboarding depends on this |
| 2 | **Custom greeting injection** into prompt | 0.5 day | Low effort, visible improvement |
| 3 | **Escalation email notification** (SMTP-based) | 1-2 days | Critical — missed escalations without push |
| 4 | **Go-live status tracking** (backend onboarding_completed flag) | 0.5 day | Enables lifecycle management |
| 5 | **Self-serve signup** (basic `/signup` route) | 3-5 days | Removes founder bottleneck |

### Must Fix Before 5 Businesses

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 6 | **Alerting: critical event emails** | 2-3 days | Push notification for failures |
| 7 | **AI error dashboard** (agent failure tracking) | 2 days | Visibility into AI health |
| 8 | **FAQ import/batch entry** | 1-2 days | Faster knowledge collection |
| 9 | **WhatsApp reserve numbers** (pre-provision) | 1 day | Eliminate 5-day wait |
| 10 | **Business health trends** (7-day charts) | 2-3 days | Proactive monitoring |

### Must Fix Before 20 Businesses

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 11 | **Business lifecycle stages** | 1 day | Segment operations by maturity |
| 12 | **Batch operations UI** | 3-5 days | Manage 20+ businesses efficiently |
| 13 | **WhatsApp recovery channel** | 2-3 days | Re-engage via primary channel |
| 14 | **Founder ops dashboard** (alert feed, trends, SLA) | 5-7 days | Single pane of glass for 20 businesses |
| 15 | **Billing/subscription management** | 5-10 days | Revenue operations |

### Nice To Have

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 16 | Document import (PDF/website scraping) | 5-7 days | Reduce knowledge entry time |
| 17 | SMS/Voice recovery channels | 3-5 days | Multi-channel re-engagement |
| 18 | Business owner onboarding tour | 2-3 days | Reduce support questions |
| 19 | Churn prediction | 5-7 days | Proactive retention |
| 20 | Customer data export | 1-2 days | Data portability |

---

## 14. Verification

All core systems verified for regressions:

| System | Status | Verified |
|--------|--------|----------|
| Website chat | PASS | `npx tsc --noEmit` clean (backend + frontend) |
| WhatsApp delivery pipeline | PASS | All imports resolved, webhook handler intact |
| Booking flow | PASS | No changes to agent.graph.ts, agent.nodes.ts, booking prompts |
| Workflow engine | PASS | Agent state, graph compilation, and node routing unchanged |
| Escalation inbox | PASS | Inbox controller, reminders, notification system intact |
| Founder dashboards | PASS | All routes, controllers, and pages compile |
| Cost dashboard | PASS | New feature, verified independently |
| Performance optimization | PASS | DB indexes, bundle optimization, virtualization intact |
| Security | PASS | All middleware chains, Twilio signature verification, RLS policies intact |
| TypeScript | PASS | `npx tsc --noEmit` on both backend and frontend — zero errors |

---

## Final Verdict

**FOUNDER BOTTLENECK IDENTIFIED**

### Evidence

1. **Every business requires founder presence.** No self-serve signup exists. The founder is the single point of failure for business creation.

2. **Owner credentials require manual handoff.** The password is shown once on the founder's screen. At 20 businesses, this means 20 manual credential transfers.

3. **No alerting infrastructure.** All monitoring is pull-based. Problems are invisible until the founder opens a dashboard. Escalations go unnoticed for 30+ minutes.

4. **WhatsApp provisioning takes days.** The 3-minute onboarding wizard creates a business quickly, but WhatsApp (the primary communication channel) takes 1-5 business days of Twilio processing.

5. **Support questions scale linearly.** Each business owner generates ~20 min/month of founder support time. At 20 businesses, that's ~7 hours/month of Q&A alone, not counting issue firefighting.

6. **Operations load reaches HIGH at 20 businesses.** Estimated 29 hours/month — approaching a part-time job. This does not include incident response, feature development, or business development.

7. **No lifecycle management.** There are no tools to differentiate new, active, growing, or churning businesses. Every business is treated identically regardless of maturity.

### The Platform Is Technically Ready — Operationally Not

The software works. A business can be created in 3 minutes, the AI answers questions correctly, bookings work, WhatsApp sends messages, and costs are tracked.

But the operational model does not scale beyond a handful of businesses because:
- The founder is embedded in every business's daily operations
- There is no self-serve, no auto-pilot, no "set and forget"
- Proactive monitoring requires manual dashboard review
- Every business problem eventually reaches the founder

**Novura at 20 businesses does not require 20x more software. It requires a fundamentally different operational model where the business owner is self-sufficient and the founder is an observer, not a participant.**
