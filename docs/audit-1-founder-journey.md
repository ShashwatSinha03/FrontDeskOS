# Nuvora Audit 1 — Founder Journey Audit

**Auditor:** Platform analysis  
**Date:** June 12, 2026  
**Commit:** `7d96a4f` (Sprint 10) + Sprint 11 code written  
**Scenario:** Onboarding first paying gym client as a SaaS founder

---

# 1. Executive Summary

Nuvora has the bones of a working platform — the AI receptionist is genuinely impressive, the booking engine works, and the operations dashboard gives owners real utility. But the founder experience of onboarding a paying client is fragile, manual, and missing critical tooling.

The core problem: **the founder has no workflow**. The platform was built feature-first (AI agent, booking, dashboard, analytics) without building the operational layer that a SaaS founder needs to run a multi-business platform. Onboarding a single client requires 6+ manual steps across 4 different pages, involves creating real Supabase auth users without any welcome email, and provides zero visibility into whether the client is actually using the system after onboarding.

**What works:** The onboarding wizard is genuinely good. Industry templates are thoughtful. The AI receptionist works. The operations dashboard is useful.

**What doesn't work:** Owner creation is manual and silent. There is no way to preview a business before going live. Post-onboarding monitoring is nonexistent. Password distribution requires a side-channel (WhatsApp/Slack/email — none of which exist in the platform). There is no way to test the customer flow without switching browsers. There is no way to know if a business is healthy, struggling, or abandoned.

---

# 2. Step-by-Step Findings

## Step 1 — Founder Login (`/login`)

### The Flow

1. Founder navigates to `https://nuvoraos.vercel.app/login`
2. Sees an email/password form with a "Sign in" button
3. Below the form: "Forgot your password?" link
4. No signup link (signup page exists at `/signup` but is not linked from login)

### Pros
- Login is standard and familiar — email + password is the baseline
- Error handling is functional (shows red banner on wrong credentials)
- Loading state is clear ("Signing in...")
- Redirect parameter works correctly (`?redirectTo=/ops`)

### Cons
- **No branding differentiation.** The login page does not distinguish between founder, owner, or staff login. A founder logging in sees the same page as a staff member at a gym. There is no "Founder Portal" label, no badge, no visual cue about which role they're logging into.
- **No session recovery.** If a founder closes the browser and returns, there is no "Welcome back" or indication of which account they're logged into until they reach `/ops`.
- **No passwordless option.** For a founder who manages multiple clients, typing a password every time is friction. No magic link, no SSO, no remembered device.
- **Forgot password is generic.** Sends a Supabase password reset email — there's no custom branding or platform name in the email.

### Risks
- **No MFA.** If a founder's credentials are compromised, every business on the platform is exposed. There is no two-factor authentication.
- **No login auditing.** There's no record of who logged in when, or from where. A compromised account leaves no trace.
- **Single session.** No session management UI — can't see active sessions, can't revoke them.

### Friction Points
- New founders will not know `https://nuvoraos.vercel.app/login` exists. There is no public landing page at `/` that explains what Nuvora is or provides a login link. The root `/` redirects to `/dashboard-placeholder` which is a generic page.

---

## Step 2 — Founder Dashboard (`/ops`)

### The Flow

1. After login, founder lands on `/ops`
2. Sees 3 stat cards at the top: Total Businesses, Total Owners, Total Staff
3. Below: a "Recent Businesses" table with 10 rows (name, owner, created date)
4. Below that: Quick Actions panel with 3 buttons: Launch Onboarding Wizard, View Businesses, View Users
5. Data loads via `GET /api/overview` (useSWR)

### Pros
- Clean layout. Three cards give a quick top-level pulse.
- Quick Actions are prominent and clear.
- Recent Businesses table is useful for finding recently created tenants.
- SWR handles loading states with skeletons.

### Cons

**Missing Founder Metrics (Critical):**
- **No health check indicator.** The dashboard does not show whether the backend API is healthy, whether the database is connected, or whether the LLM provider is responding. The first time a founder learns something is broken is when a client complains.
- **No business status breakdown.** The stat cards show total businesses but not the breakdown: active vs disabled, configured vs unconfigured, businesses with owners vs without owners.
- **No activity metrics.** The dashboard shows no aggregate activity: total leads captured today across all businesses, total appointments booked, total escalations raised. A founder has no idea if the platform is actually being used.
- **No error/inconsistency alerts.** Businesses with no owner assigned, businesses with no services, businesses that have never had a booking — none of these are surfaced.
- **No growth trend.** "Total Businesses: 12" is meaningless without context. Was it 10 last week? Is growth accelerating or flat?

**Confusing Navigation:**
- **"View Businesses" and "View Users" are separate pages.** But from a founder's perspective, businesses and their owners/users are tightly coupled. Understanding the business-health requires toggling between `/ops/businesses`, `/ops/businesses/[id]`, and `/ops/users/[id]`.
- **No "back to dashboard" from sub-pages.** Once you click into `/ops/businesses`, there's no breadcrumb or obvious navigation back to `/ops`. The browser back button is the only path.
- **No search from dashboard.** To find a specific business, you must go to `/ops/businesses` first. The dashboard's Recent Businesses table is not searchable.

**Operational Blind Spots:**
- **No indication of businesses without owners.** A recently onboarded business without an assigned owner looks identical on the dashboard to a fully configured one.
- **No indication of disabled businesses.** If a founder disabled a business (via `/ops/businesses/[id]/status`), there is no visible indicator on the dashboard or businesses list unless you open the detail page.
- **No last-active timestamp.** The founder cannot see which businesses are actively using the system vs which were onboarded and abandoned.
- **No notification of failed operations.** If an API call fails during onboarding (e.g., slug collision, Supabase auth failure), the error is logged to the server console but not surfaced to the founder anywhere in the UI.

### Friction Points
- At least 3 clicks to answer "does business X have an owner?" (/ops → /ops/businesses → /ops/businesses/[id] → scroll to owner info)
- Zero clicks to answer "is the platform healthy?" — the answer is not available anywhere in the UI
- No way to answer "which businesses are most active?" without clicking through each one

---

## Step 3 — Business Onboarding Wizard (`/ops/onboarding`)

### Step 3a — Industry Selection

**What it does:** Shows a grid of industry cards. Select one to seed the business with template services, FAQs, hours, and AI greeting.

**Pros:**
- Five industries is enough to feel thoughtfully curated
- Cards are visual with labels
- Clear "continue" affordance

**Cons:**
- **No industry preview.** The founder cannot see what services or FAQs a template includes before selecting it. They must commit, proceed through all 7 steps, and only then see what was seeded. If the template is wrong, there is no "go back and change industry" without starting over.
- **No custom industry option.** If the client's business doesn't fit neatly into a template (e.g., a gym that also does physical therapy and sells supplements), the founder is forced to pick the closest option and manually fix every field.
- **No description of what "Gym & Fitness" includes.** The card just says "Gym & Fitness." It doesn't hint that it includes personal training, yoga, nutrition consultation, HIIT, and massage therapy as seeded services.

**Friction:** Founder must trust the template blindly.

### Step 3b — Business Information

**What it does:** Form fields for business name, slug, tagline, description, phone, email, address, timezone.

**Pros:**
- All fields are standard business information
- Slug has immediate availability checking

**Cons:**
- **Slug is a critical technical detail presented without explanation.** The slug determines the business's URL (`/{slug}`). A founder might not understand that changing the slug later breaks all existing URLs. There is no warning about this.
- **Timezone dropdown is long.** 100+ timezone options with no search or geolocation default. A founder in a hurry might pick the wrong one or skip it entirely, causing appointment time display issues later.
- **No address autocomplete.** Typing a full address manually is slow and error-prone.
- **No logo upload.** The business profile has a `logo_url` field in the database but the onboarding wizard does not let you set it. The business website will have no logo until the owner manually adds one in settings (which they might never discover).

**Friction:** Slug is a permanent technical decision presented as a casual text input.

### Step 3c — Services

**What it does:** Pre-populated list of services from the chosen template. Founder can edit name, duration, price, description, and category.

**Pros:**
- Good that services are pre-populated — saves time
- Inline editing is intuitive

**Cons:**
- **No pricing guidance.** The template services have default prices, but there's no indication whether these are reasonable or just placeholder values. A founder might accidentally publish a gym with "$10 personal training" because they didn't notice the default.
- **Duration is in minutes with no validation.** 0 minutes or 10080 minutes (7 days) are both accepted.
- **Cannot reorder services.** They appear on the public site and booking flow in the order entered in the wizard. No drag-to-reorder.
- **Cannot delete a template service.** The founder can edit but there is no remove/delete button for seeded services they don't want.

**Friction:** Founder might publish a gym with services they didn't intend because there's no delete button.

### Step 3d — Hours

**What it does:** 7-day weekly schedule with open/closed toggle and start/end time inputs, pre-populated from the template.

**Pros:**
- Reasonable defaults (e.g., gym: Mon-Fri 6am-8pm, Sat 8am-6pm, Sun closed)
- Open/closed toggle is clear

**Cons:**
- **No validation.** Start time after end time is accepted. Midnight to midnight (24-hour day) is accepted without warning.
- **No timezone context.** The hours are stored without explicit timezone binding (the business timezone was set in step 2, but there's no visible reminder of what timezone these hours are in).
- **No buffer configuration.** No way to set buffer time between appointments during onboarding. The default (30 min slot, no buffer) might not suit a gym that needs 15-minute cleanup between sessions.
- **No holiday/closure handling.** Cannot mark specific dates as closed during onboarding (this is available later via availability overrides, but not in the wizard).

**Friction:** No time validation means a founder can accidentally publish broken hours.

### Step 3e — FAQs

**What it does:** Pre-populated Q&A list from the template, with add/edit/delete/reorder.

**Pros:**
- Well-seeded FAQs for each industry are genuinely useful
- Reorder works

**Cons:**
- **No bulk edit.** If the template FAQs are close but not quite right, the founder must edit each one individually. No copy-paste or batch operations.
- **No search.** If there are 10 FAQs, finding the one to edit requires scrolling.
- **No category/tagging.** All FAQs are displayed as one flat list. On the public site, they're rendered as one accordion. No grouping by topic.

**Friction:** Minimal. FAQs are straightforward. Main risk is founder skipping this step entirely and leaving default template answers that might not apply.

### Step 3f — AI Settings

**What it does:** Greeting message textarea, lead capture toggle, booking toggle, escalation email input.

**Pros:**
- Sensible defaults for greeting
- Toggle to disable lead capture or booking is a nice safety valve

**Cons:**
- **No preview of the AI greeting in context.** The founder types a greeting but cannot see how it renders in the chat widget. There is a "preview" toggle mentioned but it's unclear what it shows.
- **Escalation email is not validated.** A typo in the email address means escalated conversations will silently fail to notify anyone. There's no email verification step.
- **No tone/personality configuration.** The AI's tone is determined by the system prompt, which is not exposed in the wizard. Founders cannot say "make the AI more formal" or "make it friendlier."
- **No AI behavior explanation.** There's no tooltip or help text explaining what "Lead Capture Enabled" or "Booking Enabled" actually do. A founder might disable booking thinking it only affects the AI, not realizing it also disables the booking URL flow.

**Friction:** No preview of the most important customer-facing feature (the AI greeting).

### Step 3g — Review

**What it does:** Read-only summary of all previous steps. "Publish" button at the bottom.

**Pros:**
- Review-before-publish is standard and good
- All data is displayed in a readable format

**Cons:**
- **Cannot edit from review.** If the founder spots an error, they must navigate back through the wizard steps. There are no inline edit buttons on the review page.
- **No estimated publish time.** The publish operation creates a business, services, and schedules in a transaction. There's no indication of how long this takes (it's fast, but the founder doesn't know that).
- **No "what happens next" summary.** The founder is about to publish a live business but is not told: "After publishing, you'll need to assign an owner before anyone can log in."

**Friction:** Publishing feels like the end, but it's really only halfway through the onboarding process.

### Step 3h — Publish / Success

**What it does:** Shows a loading state ("Publishing..."), then success with businessId, tenant URL, admin URL, booking URL, slug.

**Pros:**
- Success page provides URLs that are actually useful
- Loading state gives feedback

**Cons:**
- **No owner creation prompt.** The success page says "Business created!" but does not say "Now assign an owner!" or provide a link to do so. A first-time founder will close this page and not know what to do next.
- **URLs are not clickable in the success view.** They're displayed as text. The founder must manually copy-paste.
- **No way to re-publish.** If the founder realizes they made a mistake (wrong slug, wrong services), there is no "edit" or "redo" from the success page. They must start a new onboarding with a different slug.
- **Success page is not persisted.** If the founder refreshes or navigates away, the success page is gone. The URLs are lost unless saved elsewhere.

**Critical Friction:** The success page is a dead end. It does not guide the founder to the next required action (assign owner).

---

## Step 4 — Business Verification

### The Flow

After publish, founder should:
1. Visit `/{slug}` to verify the website
2. Visit `/{slug}/book` to verify the booking flow
3. Visit `/{slug}/admin` (but cannot log in — no owner exists yet)
4. Go to `/ops/businesses/[id]` to assign an owner

### Findings

- **No one-click verification.** The founder must manually navigate to each URL. No "Open Website," "Open Booking," or "Open Admin" links that auto-navigate.
- **Cannot preview the website before assigning owner.** The website goes live immediately on publish. The AI widget is active. A customer could theoretically find the site and book before the owner even knows they have an account.
- **No way to verify AI behavior without chatting.** To test the AI receptionist, the founder must open a separate incognito browser, visit `/{slug}`, and send a chat message. They cannot simulate a customer conversation from within the admin.
- **No booking test mode.** Booking an appointment to verify the flow creates a real customer and appointment in the database. The founder would need to manually clean up test data afterward.

### Friction Points
- Verifying a onboarding requires 5+ manual URL navigations
- Testing the AI requires a second browser session
- No sandbox/test mode for verification

---

## Step 5 — Owner Creation

### The Flow

1. Founder navigates to `/ops/businesses`
2. Finds the new business (search or scroll)
3. Clicks "View" → `/ops/businesses/[id]`
4. Finds the "Assign Owner" section
5. Types an email and name
6. Clicks submit
7. Backend creates a Supabase auth user with a random password
8. **The password is never shown to the founder.** The auth user is created with `email_confirm: true` but the founder never sees the password. There is no way to retrieve it.

### Critical Findings

**The password problem:**
This is the single most broken part of the entire founder journey. When the founder creates an owner:

1. Supabase creates the auth user with a randomly generated password
2. The password is not returned by the Supabase admin API (unless explicitly set)
3. Even if a password were set, the response doesn't display it in the UI
4. There is no welcome email sent
5. The owner cannot log in because they don't know their password

**The workaround (current state):**
The founder must:
1. Create the owner with a known password (the API might accept a password — needs verification)
2. Manually communicate the password to the owner via a side channel (WhatsApp, Slack, phone call)
3. Hope the owner doesn't lose the password (no "forgot password" flow is not tested for newly created users — Supabase's built-in reset flow should work, but requires the owner to know the login page URL)

**Additional issues:**
- **No way to resend credentials.** If the owner loses the password, the founder must go to `/ops/users/[id]` and use "Reset Password" — which sends a Supabase password reset email (if the owner can access their email).
- **No way to verify the owner logged in.** The founder has no visibility into whether the owner successfully authenticated after being created.
- **No batch owner creation.** For a gym chain with multiple locations, the founder must repeat this process for each location individually.

**Risk:** A founder could onboard a paying client and be unable to deliver working credentials. This is a business-ending failure for a SaaS product.

---

## Step 6 — Business Monitoring

### The Flow

After onboarding, the founder returns to `/ops` periodically to check on their clients.

### Findings

- **Minimal monitoring:** The dashboard shows total counts and a list of recent businesses. That's it.
- **No per-business health indicators.** The founder cannot see:
  - Which businesses have active subscriptions (none exist — no billing)
  - Which businesses have logged in recently
  - Which businesses have bookings this week
  - Which businesses have zero activity (possibly abandoned)
  - Which businesses have disabled their AI or booking (possibly confused)
  - Which businesses have pending escalations that haven't been resolved
- **No notification of problems.** If a business's LLM API key fails, if their database queries are slow, if they have 10 unanswered escalations — the founder has no way of knowing.
- **No engagement metrics.** The founder cannot answer: "Is Client A actually using Nuvora?" without logging into the client's admin dashboard (which they cannot do without the client's credentials).
- **No churn prediction.** No way to identify businesses that are about to churn (low activity, declining bookings, unread notifications stacking up).

### Friction Points
- Founder is blind to client health post-onboarding
- No way to proactively help struggling clients
- No way to celebrate successful clients (case studies, testimonials)

---

## Step 7 — Full Workflow Test

### Simulating a Customer Journey

To verify the platform works end-to-end, the founder must:

1. Open an incognito/private browser window
2. Navigate to `https://nuvoraos.vercel.app/{slug}`
3. Open the AI chat widget
4. Send a message (e.g., "Hi, I'd like to book a personal training session")
5. Wait for the AI to respond
6. Provide name and contact info (becomes a lead)
7. Book an appointment
8. Switch back to the founder browser
9. Log into the owner account (requires owner credentials — which the founder may not have)
10. Or if testing as founder, they cannot access `/{slug}/admin` because they're not a member of that business

### Findings

- **Founder cannot impersonate.** There is no "log in as" or "impersonate business" feature. A founder cannot test the owner experience without the owner's password.
- **No test/sandbox mode.** All customer interactions (leads, appointments) created during testing are real. They pollute the business data.
- **Cannot verify notifications.** To see if notification creation works, the founder must check the business's notification list — which requires owner access.
- **Cannot verify analytics.** Analytics update in real time, but the founder cannot view them without owner credentials.
- **Cannot verify staff experience.** Testing what a staff member sees requires creating a staff account, logging out, and logging in as staff.

### Friction Points
- Testing the full customer lifecycle requires 2+ browser sessions and multiple accounts
- No impersonation or test mode exists
- Test data is real and permanent

---

## Step 8 — Operational Readiness Review

### Onboarding 1 Business

**Bottlenecks:** Manual owner creation + password delivery.

**Time estimate:** 10-15 minutes if everything goes smoothly. 30-60 minutes if issues arise (slug collision, wrong template, forgot to assign owner).

**Verdict:** Manageable. A founder can handle this with careful attention.

### Onboarding 10 Businesses

**Bottlenecks:**
- No batch operations (must onboard each one individually through the 7-step wizard)
- Owner creation is 5 clicks per business across 2 different pages
- Password delivery requires 10 separate side-channel messages
- No way to track which businesses have been fully onboarded vs which are stuck at "owner not assigned"

**Time estimate:** 3-5 hours of manual work.

**Verdict:** Painful but possible. A founder would likely make mistakes on at least one business.

### Onboarding 50 Businesses

**Bottlenecks:**
- All of the above, multiplied by 50
- No import/CSV support — each business's data (services, hours, FAQs) must be entered manually through the wizard
- No template customization — if a founder wants to adjust the gym template (e.g., add a standard "Free Consultation" service to all new gyms), they must edit each onboarding individually
- No API for programmatic onboarding — the `/api/onboarding/publish` endpoint exists but is not exposed or documented for external use

**Time estimate:** 25-40 hours of concentrated manual work across multiple days.

**Verdict:** Impractical. A founder at this scale would need a dedicated onboarding specialist.

### Onboarding 100 Businesses

**Bottlenecks:**
- All of the above
- No way to delegate onboarding (no staff accounts for the founder's own team)
- No way to track onboarding progress across multiple concurrent onboardings
- No CRM to manage client communication during the onboarding process

**Time estimate:** 50-80+ hours. Essentially a full-time job for 2+ weeks.

**Verdict:** Not feasible without either (a) a dedicated onboarding team, (b) programmatic onboarding APIs, or (c) significant automation.

---

## Step 9 — Risk Assessment

### Critical Risks

| # | Risk | Description | Likelihood | Impact |
|---|---|---|---|---|
| CR-1 | **New owner cannot log in** | Owner creation does not return or communicate the password. Owner receives no welcome email. Founder has no way to deliver credentials securely. | High | Critical — client cannot use the product |
| CR-2 | **Database migration gap** | 11 core tables (businesses, customers, appointments, escalations, etc.) have no CREATE TABLE SQL in the migrations directory. If the Supabase database is ever recreated or cloned, these tables do not exist. | Low | Critical — total data loss on database rebuild |
| CR-3 | **No backup/restore** | No built-in backup mechanism. Relying entirely on Supabase's automated backups. If a migration corrupts data, there is no rollback process. | Medium | Critical — unrecoverable data loss |
| CR-4 | **Single Express process** | Backend runs as a single Node.js process on Render. No horizontal scaling. No graceful shutdown. No process manager (nodemon in dev only). | Medium | Critical — one crash takes down all businesses |

### High Risks

| # | Risk | Description | Likelihood | Impact |
|---|---|---|---|---|
| HR-1 | **No automated tests** | Zero test files found. No CI pipeline catches regressions. A deployment can break core flows silently. | High | High — undetected regressions reach production |
| HR-2 | **Hardcoded secrets** | Supabase URL, anon key, and admin API key are hardcoded in multiple frontend and backend source files. Not read from environment at runtime. | High | High — secrets exposed in source code, rotation requires code change |
| HR-3 | **No founder monitoring** | Founder has no visibility into platform health, business activity, or error rates. Problems are discovered when clients complain. | High | High — reactive support, no proactive maintenance |
| HR-4 | **Onboarding creates live data** | Publishing a business immediately makes it live. No draft/preview. No test mode. A misconfiguration is immediately public. | Medium | High — wrong slug, prices, or hours visible to customers immediately |
| HR-5 | **LLM provider single point of failure** | If Groq (the default LLM provider) experiences an outage or rate limit, every AI receptionist across every business stops working. No automatic failover. | Medium | High — all AI conversations fail silently |

### Medium Risks

| # | Risk | Description | Likelihood | Impact |
|---|---|---|---|---|
| MR-1 | **No email infrastructure** | No transactional emails (welcome, password reset, notification digests). All communication must happen outside the platform. | High | Medium — operational friction but not system-breaking |
| MR-2 | **No session management** | Users cannot see or revoke active sessions. A stolen session token is valid until the password changes. | Medium | Medium — accounts vulnerable to session hijacking |
| MR-3 | **No audit trail** | No system-wide audit log. If a business owner disables services and claims "the system did it," there is no forensic record. | Medium | Medium — liability risk |
| MR-4 | **Slug is permanent** | Changing a slug breaks all bookmarks, links, and SEO. There is no redirect from old slug to new slug. | Low | Medium — SEO damage, broken links |
| MR-5 | **Rate limiting is global** | Rate limits (200/100 per 15 min) apply to the entire API, not per-business. One business's high-volume AI chat traffic can exhaust the limit and throttle other businesses. | Low | Medium — cross-business interference |

### Low Risks

| # | Risk | Description | Likelihood | Impact |
|---|---|---|---|---|
| LR-1 | **No CORS for unknown origins** | Production CORS allows 3 specific domains. New deployment URLs (staging, preview) are denied unless explicitly added. | Low | Low — staging deployments won't work |
| LR-2 | **No input length limits** | Business description, FAQ answers, AI greeting have no length validation in the frontend. Long content could break layout. | Medium | Low — visual breakage, not data loss |
| LR-3 | **LocalStorage draft persistence** | Onboarding wizard saves drafts to localStorage. Clearing browser cache loses the draft. | Low | Low — inconvenience, not data loss |
| LR-4 | **No loading states on settings saves** | Settings page saves do not show loading spinners. Double-clicking the save button could send duplicate requests. | Medium | Low — idempotent operations prevent duplicates |

---

## Step 10 — Final Scorecard

| Category | Score | Reasoning |
|---|---|---|
| **Founder Experience** | 3/10 | The founder has no guided workflow, no monitoring, and no way to complete an onboarding without manual side-channel communication. The dashboard provides minimal actionable information. |
| **Operational Clarity** | 4/10 | Individual parts are clear (the wizard, the business detail page) but the overall workflow is fragmented across 5+ pages with no connective tissue between them. |
| **Onboarding Speed** | 5/10 | For a single business, the wizard is fast (7 steps). But the post-wizard steps (owner creation, password delivery, verification) add significant manual overhead and friction. |
| **Support Burden** | 2/10 | The founder cannot support clients effectively because: (a) no monitoring, (b) no impersonation, (c) no way to see what the client sees, (d) no internal notes/ticketing system, (e) password recovery requires Supabase admin actions. |
| **Scalability** | 2/10 | 1-3 businesses is manageable. 10 is painful. 50+ is impractical without automation. No batch operations, no API for programmatic onboarding, no team delegation. |

### Overall Score: 3.2/10

---

# Final Verdict

## Would I confidently onboard a paying gym tomorrow?

## NO.

**The password problem alone is a dealbreaker.** I cannot take money from a gym owner and then fail to deliver working login credentials. The current flow creates a Supabase auth user silently and never tells me (the founder) what the password is. I would have to:

1. Create the owner account
2. Navigate to a different page
3. Initiate a password reset
4. Hope the owner receives the reset email (which might go to spam because it's from Supabase, not from "Nuvora")
5. Explain to a non-technical gym owner how to click a password reset link and set a new password
6. Hope they don't get frustrated and ask for a refund

**Additional blockers:**

- **I cannot test the product I'm selling.** I cannot experience the owner dashboard, notifications, or analytics without the owner's credentials. If I'm selling gym owners on "you'll love the analytics dashboard," I need to be able to show it to them — which I can't without logging in as them.

- **I cannot verify the system is working after onboarding.** I hand over credentials, say "good luck," and hope the LLM doesn't fail, the database doesn't go down, and the gym owner doesn't need help.

- **I have no support infrastructure.** If the gym owner has a question at 8 PM on a Saturday, I have no way to see what they're seeing, no way to help them troubleshoot, and no way to even know they're having a problem until they email me.

**What would need to be true for a YES:**

The password delivery problem must be solved. The founder needs a way to either (a) set an initial password during owner creation and see it displayed once, (b) have a branded welcome email sent automatically, or (c) both.

The founder needs basic monitoring — at minimum: "is the backend up," "which businesses have activity this week," and "which businesses don't have an owner assigned yet."

The founder needs a way to preview a business without having to log into a separate browser session.

And critically: the founder needs a way to support clients without needing their passwords.

---

# Appendix: Quick Reference — Founder's Actual Workflow

```
Step 1:  Navigate to /login                              [1 click]
Step 2:  Enter email + password                           [2 fields]
Step 3:  Land on /ops                                     [automatic]
Step 4:  Click "Launch Onboarding Wizard"                  [1 click]
Step 5:  Select industry                                   [1 click]
Step 6:  Fill business info                                [8+ fields]
Step 7:  Review/edit services                              [varies]
Step 8:  Set hours                                         [7 days × 2-3 fields]
Step 9:  Review/edit FAQs                                  [varies]
Step 10: Configure AI settings                             [4 fields]
Step 11: Review and publish                                [1 click]
Step 12: Copy URLs from success page                       [manual]
Step 13: Navigate to /ops/businesses                       [1 click]
Step 14: Find the new business                             [search/scroll]
Step 15: Click "View"                                      [1 click]
Step 16: Scroll to "Assign Owner" section                  [scroll]
Step 17: Enter owner email + name                          [2 fields]
Step 18: Submit                                            [1 click]
Step 19: ??? password is never shown ???                   [dead end]
Step 20: Navigate to /ops/users                            [1 click]
Step 21: Find the new user                                 [search/scroll]
Step 22: Click "View"                                      [1 click]
Step 23: Click "Reset Password"                            [1 click]
Step 24: Tell owner to check email                         [side channel]
Step 25: Open incognito window                             [another browser]
Step 26: Navigate to /{slug}                               [verify website]
Step 27: Open chat widget                                  [verify AI works]
Step 28: Navigate to /{slug}/book                          [verify booking]
         ─────────────────────────────────────────────────────────────
         Total: 28+ steps, 6+ different pages, 2 browser sessions
```
