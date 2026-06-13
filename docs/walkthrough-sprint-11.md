# Nevura — Platform Walkthrough & Audit (Sprint 11)

**Date:** June 12, 2026
**Commit:** `7d96a4f` (Sprint 10: Notification Center)
**Note:** Sprint 11 (Analytics) code is written but not yet committed.

---

# Part 1 — System Overview

## 1.1 Public Website
- **Purpose:** Online storefront for each tenant business. Displays business name, description, services, FAQs, and an AI chat widget.
- **Primary users:** End customers browsing a business.
- **Entry route:** `/{slug}` (e.g. `/brightsmile`)
- **Key capabilities:**
  - Hero section with business name/tagline
  - Services overview grid
  - About section with description
  - FAQ accordion
  - CTA banner linking to `/book`
  - Floating AI Assistant chat widget
- **Data read:** Business profile, services (active only), FAQs from `GET /api/public/businesses/:slug`
- **Data written:** None (read-only page)

## 1.2 Booking Engine
- **Purpose:** Self-serve appointment booking for end customers.
- **Primary users:** End customers.
- **Entry route:** `/{slug}/book`
- **Key capabilities:**
  - 5-step wizard: Service → Date → Time → Info → Confirm
  - Pre-selects service via `?service=` query parameter
  - Validates slot availability in real time
  - Creates customer + appointment on confirm
- **Data written:** Creates `customers`, `customer_channels`, `appointments`, `conversations` rows
- **API:** `POST /api/appointments/book` (uses x-api-key from backend proxy)

## 1.3 AI Receptionist
- **Purpose:** Conversational AI agent that handles inquiries, books appointments, answers FAQs, captures leads, and escalates to humans.
- **Primary users:** End customers via web chat widget on the public site.
- **Entry route:** `POST /api/chat` (backend endpoint, called from the chat widget on `/{slug}`)
- **Key capabilities:**
  - 10 intent classifications: greeting, information, pricing, booking, reschedule, cancellation, lead capture, escalation, human request, unknown
  - LangGraph-powered conversation agent with 8 specialized nodes
  - Side-effect execution: lifecycle state transitions, escalations, knowledge requests
  - Recovery/abandonment detection engine
  - Multi-LLM provider support (Groq active, OpenAI/Anthropic available)
- **Data read:** Business profile, services, conversation history
- **Data written:** Creates/updates customers, conversations, messages, escalations, knowledge requests, follow-ups

## 1.4 Authentication
- **Purpose:** Identity and access control for owners, staff, and founders.
- **Primary users:** All authenticated users (owners, staff, super admins).
- **Entry routes:** `/login`, `/forgot-password`, `/reset-password`
- **Key capabilities:**
  - Supabase Auth with email/password
  - Session management via `@supabase/ssr` (server + client + middleware)
  - `AuthProvider` context wraps the app with `useAuth()` hook
  - Middleware protects `/ops/*` and `/{slug}/admin/*` routes
- **Data read:** Supabase auth.users, public.profiles
- **Auth flow:** Login → Supabase session → Bearer token → Backend `authenticate` middleware verifies with Supabase Admin API

## 1.5 RBAC (Role-Based Access Control)
- **Purpose:** Enforce permissions across the platform.
- **Primary users:** System (enforced by middleware).
- **Key components:**
  - **Global roles:** `SUPER_ADMIN` (profiles.global_role) and `USER` (default)
  - **Business roles:** `owner` and `staff` (staff_profiles.role)
  - **Membership status:** `active`, `invited`, `suspended`
- **Middleware chain:** `authenticate` → `loadMembership` → `requireOwner()` / `requireSuperAdmin`
- **Permissions:**
  - `requireSuperAdmin`: Founder Dashboard (`/ops/*` routes)
  - `requireOwner()`: Settings mutation endpoints (business update, services CRUD, hours, FAQs, AI config, team invite/promote/remove)
  - `loadMembership` only (no requireOwner): Dashboard, leads, appointments, escalations, analytics, notifications (both owner + staff)
  - No auth: `publicRouter` endpoints

## 1.6 Founder Dashboard
- **Purpose:** Platform-wide management console for super admins.
- **Primary users:** Founder/super admin.
- **Entry routes:** `/ops`, `/ops/businesses`, `/ops/businesses/[id]`, `/ops/users`, `/ops/users/[id]`
- **Key capabilities:**
  - Platform overview: total businesses, owners, staff counts
  - Business CRUD: search, view, edit, disable, assign owners, transfer ownership
  - User management: list, view, reset passwords, change status, remove memberships
  - Onboarding monitoring: view completed onboarding records
- **Auth:** `authenticate` + `requireSuperAdmin`

## 1.7 Business Dashboard
- **Purpose:** Daily operations hub for owners and staff.
- **Primary users:** Business owners and staff.
- **Entry route:** `/{slug}/admin`
- **Key capabilities:**
  - Lead funnel (4 KPI cards: New, Contacted, Qualified, Won)
  - Attention Required section (unread notifications, pending escalations, open leads, today's appointments)
  - Today's Appointments with inline Confirm/Complete/Cancel
  - Open Leads with inline Qualify/Lost
  - Pending Escalations with inline Resolve + note
  - Recent Activity feed
  - Quick action links to leads, appointments, settings
- **Auth:** Server-side session check + membership validation (both owner and staff)

## 1.8 Team Management
- **Purpose:** Manage staff and owners for a business.
- **Primary users:** Business owners.
- **Entry route:** `/{slug}/admin/team`
- **Key capabilities:**
  - List all team members with roles and status
  - Invite new staff (creates Supabase auth user + staff_profile)
  - Update staff status (active/invited/suspended)
  - Remove staff
  - Promote staff to owner
- **Auth:** Owner-only for mutations (invite, promote, remove, status change); owner+staff for list view

## 1.9 Settings CMS
- **Purpose:** Configure all aspects of a business.
- **Primary users:** Business owners (read-only for staff).
- **Entry route:** `/{slug}/admin/settings`
- **Tabs (6):**
  1. **Business** — name, email, phone, address, description
  2. **Services** — add, edit, enable/disable, set name/duration/price
  3. **Hours** — 7-day weekly schedule with open/closed toggle
  4. **FAQs** — add, edit, delete, reorder Q&A pairs
  5. **AI** — greeting message, lead capture toggle, booking toggle, escalation email
  6. **Team** — embedded TeamManagement component
- **Auth:** `loadMembership` for reads, `requireOwner()` for writes
- **Frontend gating:** All input fields disabled when `role !== 'owner'`

## 1.10 Operations Hub
- **Purpose:** Daily operational actions for managing leads, appointments, and escalations.
- **Primary users:** Owners and staff.
- **Entry route:** `/{slug}/admin` (dashboard), `/{slug}/admin/leads`, `/{slug}/admin/appointments`, `/{slug}/admin/escalations`
- **Key endpoints (Bearer token, authenticate + loadMembership):**
  - `GET /api/operate/dashboard` — aggregated daily view
  - `GET /api/operate/leads` — paginated + searchable by state + keyword
  - `PATCH /api/operate/leads/:id/lifecycle` — transition lead state (creates notification)
  - `GET /api/operate/appointments` — paginated + filterable by status
  - `PATCH /api/operate/appointments/:id/status` — confirm/complete/cancel (creates notification)
  - `PATCH /api/operate/appointments/:id/reschedule` — reschedule (creates notification)
  - `GET /api/operate/escalations` — paginated + filterable by status
  - `POST /api/operate/escalations/:id/resolve` — resolve with note (creates notification)

## 1.11 Notifications
- **Purpose:** In-app notification system for business events.
- **Primary users:** Owners and staff.
- **Entry route:** Notification bell in admin header, drawer opens on click.
- **Key capabilities:**
  - Bell icon with live unread count badge (polls every 30 seconds)
  - Right-side drawer with list of notifications (title, message, timeago, read/unread state)
  - Mark single notification as read
  - Mark all notifications as read
  - 13 notification types:
    - Lead: captured, qualified, won, lost
    - Appointment: booked, confirmed, completed, cancelled, rescheduled
    - Escalation: raised, resolved
    - Staff: invited, promoted, removed
- **Auth:** `authenticate` + `loadMembership` (owner + staff)
- **Data read:** notifications table (business-scoped)
- **Data written:** notifications table (created via hooks in controllers)

## 1.12 Analytics
- **Purpose:** Business intelligence dashboard for performance metrics.
- **Primary users:** Owners and staff.
- **Entry route:** `/{slug}/admin/analytics` (sidebar link between Dashboard and Leads)
- **Key capabilities:**
  - 4 KPI cards: Total Leads, Total Appointments, Conversion Rate, Completion Rate
  - Lead Funnel: 5-stages (New, Contacted, Qualified, Won, Lost) with horizontal progress bars
  - Service Leaderboard: ranked by bookings, showing completed/cancelled
  - Trends (30 days): inline SVG line charts for Leads and Appointments
  - Escalation Health: total, resolved, resolution rate with progress bar
- **Auth:** `authenticate` + `loadMembership` (owner + staff)
- **Endpoints:** `GET /api/analytics/overview`, `/services`, `/trends?range=30d`, `/funnel`
- **Data read:** Aggregate queries on customers, appointments, escalations, services tables (read-only)

---

# Part 2 — User Types

## 2.1 Super Admin (Founder)

**What they can access:**
- `/ops/*` — Full founder dashboard
- `/ops/onboarding` — Onboarding wizard
- `/ops/businesses/*` — All businesses (list, view, edit, disable, assign owners)
- `/ops/users/*` — All users (list, view, reset passwords, change status, transfer ownership, remove memberships)
- `/ops/onboarding/success` — Onboarding completion records
- `/login`, `/forgot-password` — Standard auth pages

**What they can edit:**
- Any business: name, email, phone, description, status (active/disabled)
- Any user: membership status, password reset
- Business ownership: assign owner, transfer ownership
- Can remove staff memberships

**What they cannot do:**
- Cannot access business admin dashboards via the UI routes (no sidebar or navigation to `/{slug}/admin`)
- Cannot operate daily business functions (manage leads, appointments, escalations)
- Cannot access settings CMS for a specific business
- No business-specific notifications

**Route prefix:** All `/ops/*` routes protected by middleware + `requireSuperAdmin` backend check.

## 2.2 Owner

**What they can access:**
- `/{slug}/admin` — Full business dashboard
- `/{slug}/admin/analytics` — All analytics
- `/{slug}/admin/leads` — List, search, filter, update lifecycle
- `/{slug}/admin/leads/[id]` — Full customer 360 view
- `/{slug}/admin/appointments` — List, filter, confirm/complete/cancel/reschedule
- `/{slug}/admin/escalations` — List, filter, resolve with note
- `/{slug}/admin/follow-ups` — View all follow-ups
- `/{slug}/admin/learning-inbox` — View and approve/reject knowledge requests
- `/{slug}/admin/settings` — All 6 tabs (full read/write)
- `/{slug}/admin/team` — Full team management (invite, promote, remove)
- Notification bell — Full read/mark access
- Public `/{slug}` and `/{slug}/book` as end customer

**What they can edit:**
- All business settings: business profile, services, hours, FAQs, AI config
- Team: invite, promote, remove, change status
- Leads: qualify, mark as lost, transition lifecycle state
- Appointments: confirm, complete, cancel, reschedule
- Escalations: resolve with note
- Knowledge requests: approve or reject

**What they cannot do:**
- Cannot access platform-wide operations (`/ops/*`)
- Cannot see other businesses' data
- Cannot change their own role
- Cannot delete their own business
- No billing/payment operations (not implemented)

**Route prefix:** All `/{slug}/admin/*` routes protected by server-side session + membership check.

## 2.3 Staff

**What they can access:**
- `/{slug}/admin` — Full business dashboard (same as owner)
- `/{slug}/admin/analytics` — All analytics (same as owner)
- `/{slug}/admin/leads` — List, search, filter, update lifecycle (same as owner)
- `/{slug}/admin/leads/[id]` — Full customer 360 view (same as owner)
- `/{slug}/admin/appointments` — List, filter, confirm/complete/cancel/reschedule (same as owner)
- `/{slug}/admin/escalations` — List, filter, resolve with note (same as owner)
- `/{slug}/admin/follow-ups` — View all follow-ups (same as owner)
- `/{slug}/admin/learning-inbox` — View and approve/reject knowledge requests (same as owner)
- `/{slug}/admin/settings` — Read-only view (all inputs disabled, readonly)
- `/{slug}/admin/team` — Read-only view (TeamManagement component with `readOnly={true}`)
- Notification bell — Full read/mark access (same as owner)

**What they can edit:**
- Leads: qualify, mark as lost, transition lifecycle state
- Appointments: confirm, complete, cancel, reschedule
- Escalations: resolve with note
- Knowledge requests: approve or reject

**What they cannot do:**
- Cannot edit business settings (name, services, hours, FAQs, AI config)
- Cannot manage team (invite, promote, remove, change status)
- Cannot access platform-wide operations
- Cannot see other businesses' data
- Cannot delete anything

**Enforcement:** Backend `requireOwner()` middleware gates all settings mutations and team management operations. Frontend also disables inputs and shows read-only mode when `role !== 'owner'`.

---

# Part 3 — Route Map

## Public Routes (no auth required)

```
/                                   (redirects to /dashboard-placeholder or marketing)
/login                              Login page
/forgot-password                    Password reset request
/reset-password                     Password reset form
/unauthorized                       Access denied page
/auth/callback                      OAuth callback handler

/{slug}                             Business public website
/{slug}/book                        Booking wizard
/{slug}/book/success                Booking confirmation
/{slug}/contact                     Contact form
/{slug}/services                    Services listing

/api/public/businesses/:slug        Business profile + services
/api/public/businesses/:slug/services
/api/public/businesses/:slug/contact
/api/public/sessions/create
/api/chat                           AI Receptionist (resolveSession middleware)
/api/appointments/slots             Check availability
/api/appointments/book              Create appointment
/api/conversations/:id/messages     Get chat messages

/health                             Backend health check
```

## Authenticated Routes (session required)

**Founder/Super Admin only:**

```
/ops                                Founder dashboard overview
/ops/businesses                     Business management list
/ops/businesses/[id]                Business detail
/ops/businesses/[id]/edit           Business editor
/ops/users                          User management list
/ops/users/[id]                     User detail
/ops/onboarding                     Onboarding wizard
/ops/onboarding/success             Onboarding success

/api/me/membership                  Current user's membership
/api/me/profile                     Current user's profile
/api/team                           Team list (owner + staff)
/api/team/invite                    Invite staff (owner only)
/api/team/:id/status               Update staff status (owner only)
/api/team/:id                       Remove staff (owner only)
/api/team/:id/promote              Promote to owner (owner only)

/api/settings/business              GET/PATCH business profile
/api/settings/services              GET/POST services
/api/settings/services/:id          PATCH service
/api/settings/services/:id/toggle   Toggle service active
/api/settings/hours                 GET/PUT operating hours
/api/settings/faqs                  GET/PUT FAQs
/api/settings/ai                    GET/PATCH AI config

/api/operate/dashboard              Daily operations dashboard
/api/operate/leads                  Paginated leads
/api/operate/leads/:id/lifecycle    Update lead state
/api/operate/appointments           Paginated appointments
/api/operate/appointments/:id/status  Update appointment status
/api/operate/appointments/:id/reschedule  Reschedule appointment
/api/operate/escalations            Paginated escalations
/api/operate/escalations/:id/resolve  Resolve escalation

/api/notifications                  List notifications
/api/notifications/:id/read         Mark notification read
/api/notifications/read-all         Mark all read
/api/notifications/unread-count     Unread count

/api/analytics/overview             Aggregate KPIs
/api/analytics/services             Service performance
/api/analytics/trends               Daily time series
/api/analytics/funnel               Lead funnel breakdown

/api/overview                       Founder platform overview
/api/businesses                     Founder: list businesses
/api/businesses/:id                 Founder: get business
/api/businesses/:id                 Founder: update business
/api/businesses/:id/assign-owner    Founder: assign owner
/api/businesses/:id/status          Founder: toggle status
/api/users                          Founder: list users
/api/users/:id                      Founder: get user
/api/users/:id/status               Founder: update status
/api/users/:id/reset-password       Founder: reset password
/api/users/:id/transfer-ownership   Founder: transfer ownership
/api/users/:id/membership           Founder: remove membership
/api/onboarding                     Founder: onboarding records

/api/onboarding/templates/:industry  Industry templates
/api/onboarding/publish              Publish tenant
/api/onboarding/owner                Create owner account

/api/admin/*                        Legacy API-key-protected endpoints
/api/dashboard/summary              Legacy dashboard summary
/api/leads                          Legacy leads (API-key)
/api/escalations                    Legacy escalations (API-key)
/api/knowledge-base/requests        Legacy knowledge requests
/api/appointments                   Legacy appointments (API-key)
/api/availability/*                 Legacy availability (API-key)
/api/follow-ups                     Legacy follow-ups (API-key)
/api/cron/follow-ups                Legacy follow-up trigger
/api/recovery/config                Legacy recovery config

/dashboard-placeholder              Fallback page
```

## Admin Routes (business-scoped, session + membership required)

```
/{slug}/admin                       Business dashboard
/{slug}/admin/analytics             Analytics (between Dashboard and Leads in sidebar)
/{slug}/admin/leads                 Leads list
/{slug}/admin/leads/[id]            Lead detail / customer 360
/{slug}/admin/appointments          Appointments list
/{slug}/admin/escalations           Escalations list
/{slug}/admin/follow-ups            Follow-ups list
/{slug}/admin/learning-inbox        Knowledge requests
/{slug}/admin/settings              Settings CMS (6 tabs)
/{slug}/admin/team                  Team management
```

---

# Part 4 — Founder Journey

## Step 1: Login as Founder

1. Navigate to `https://nevuraos.vercel.app/login`
2. Enter founder email and password
3. Supabase validates credentials via `signInWithPassword()`
4. On success, redirects to `/ops?redirectTo=...` (defaults to `/ops`)
5. Middleware confirms session exists, allows access to `/ops/*`
6. Backend `requireSuperAdmin` middleware checks `profiles.global_role === 'SUPER_ADMIN'`

## Step 2: Open Founder Dashboard

1. Land on `/ops`
2. See 3 stat cards: Total Businesses, Total Owners, Total Staff
3. See Recent Businesses list: 10 most recently created businesses with owner name and creation date
4. See Quick Actions panel with 3 buttons:
   - "Launch Onboarding Wizard" → `/ops/onboarding`
   - "View Businesses" → `/ops/businesses`
   - "View Users" → `/ops/users`
5. Data comes from `GET /api/overview`

## Step 3: Create a Business via Onboarding Wizard

1. Click "Launch Onboarding Wizard" → navigate to `/ops/onboarding`
2. 7-step wizard:
   - **Step 1 (Industry):** Select a template (Gym & Fitness, Salon & Beauty, Spa & Wellness, Dental Clinic, Professional Services). Seeds services, hours, FAQs, greeting.
   - **Step 2 (Business):** Enter name, slug, tagline, description, phone, email, address, timezone.
   - **Step 3 (Services):** Review/edit template services (name, duration, price, description, category).
   - **Step 4 (Hours):** Set weekly hours (open/closed + start/end per day).
   - **Step 5 (FAQs):** Review/edit Q&A pairs.
   - **Step 6 (AI):** Configure greeting, escalation email, slot duration.
   - **Step 7 (Review):** Review all data and click "Publish".
3. On publish, calls `POST /api/onboarding/publish` which:
   - Checks idempotency (sessionId)
   - Checks slug availability
   - Creates business, services, schedules in a transaction
   - Returns businessId, tenantUrl, adminUrl, bookingUrl, slug
4. Redirects to `/ops/onboarding/success?businessId=...&slug=...&adminUrl=...&bookingUrl=...`

## Step 4: Assign Owner

1. Navigate to `/ops/businesses` and find the new business
2. Click "View" → `/ops/businesses/[id]`
3. See business details with owner info (currently null or placeholder)
4. Click assign owner → fills form with email, name
5. Backend creates Supabase auth user + assigns to business via `staff_profiles`
6. Owner receives account credentials (no email is sent — password must be communicated separately)

## Step 5: Open Business Website

1. Navigate to `/{slug}` (e.g. `/brightsmile`)
2. See live public website with business branding, services, FAQs
3. AI Assistant chat widget is visible in the corner

## Step 6: Verify Business Setup

1. Navigate to `/{slug}/book` to verify booking flow works
2. Navigate to `/{slug}/admin` to verify admin access works (need owner login)
3. Go back to `/ops/businesses` — see status is "active"

## Step 7: Monitor Business

1. Check `/ops` dashboard for platform-wide stats
2. View `/ops/businesses` for all businesses with search
3. View `/ops/users` for all users with role filter
4. No ongoing monitoring dashboards per business (founder cannot access business admin)

---

# Part 5 — Business Owner Journey

## Step 1: Receive Account

1. Founder creates owner via `/ops/businesses/[id]/assign-owner`
2. Owner receives email and password (manually communicated — no invite email system)
3. Owner's Supabase auth account is created with `email_confirm: true`

## Step 2: Login

1. Navigate to `https://nevuraos.vercel.app/login`
2. Enter email and password
3. On success, redirects to `/{slug}/admin`
4. Middleware checks session, admin layout validates membership against the business

## Step 3: Access Dashboard

1. Land on `/{slug}/admin`
2. See:
   - Lead funnel cards (New, Contacted, Qualified, Won)
   - Attention Required section: unread notifications, pending escalations, open leads, today's appointments
   - Today's Appointments with inline action buttons
   - Open Leads with inline Qualify/Lost
   - Pending Escalations with inline Resolve
   - Recent Activity feed
   - Quick action links: View Leads, View Appointments, Open Settings

## Step 4: Configure Business

1. Navigate to `/{slug}/admin/settings`
2. **Business tab:** Edit name, email, phone, address, description. Click Save.
3. **Services tab:** Add services with name, duration, price. Edit existing. Toggle enable/disable.
4. **Hours tab:** Set weekly schedule per day (open/closed + start/end). Save.
5. **FAQs tab:** Add, edit, delete, reorder Q&A items. Save.

## Step 5: Manage Services

Add a service:
1. Go to Settings → Services tab
2. Click "Add" → inline form appears
3. Enter name, duration (minutes), price min/max, description
4. Click save → `POST /api/settings/services`

Disable a service:
1. Click the toggle button on a service row
2. `PATCH /api/settings/services/:id/toggle`
3. Service is marked `is_active = false`
4. Service immediately disappears from: public website (`/{slug}`), booking flow (`/{slug}/book`), AI recommendations

## Step 6: Manage Hours

1. Go to Settings → Hours tab
2. Each day shows: toggle open/closed, start time, end time
3. Make changes and click "Save"
4. `PUT /api/settings/hours` — replaces all weekly schedule rows

## Step 7: Manage FAQs

1. Go to Settings → FAQs tab
2. See existing Q&A list
3. Edit: click text to edit inline
4. Add: fill in new question/answer
5. Delete: click X button
6. Reorder: up/down arrows
7. Click "Save" → `PUT /api/settings/faqs`

## Step 8: Manage AI Greeting

1. Go to Settings → AI tab
2. Edit greeting message (shown to first-time chat visitors)
3. Toggle "Lead Capture Enabled" (stops AI from collecting contact info)
4. Toggle "Booking Enabled" (stops AI from offering bookings)
5. Set escalation email (notifications email for escalated conversations)
6. Click Save → `PATCH /api/settings/ai`

## Step 9: Invite Staff

1. Go to `/{slug}/admin/team` or Settings → Team tab
2. Click "Invite Staff"
3. Enter email, name, role (staff)
4. Supabase auth user is created via service role key
5. `staff_profiles` row created with role='staff', status='invited'
6. Notification created: "Staff Invited — {name} was invited as staff."
7. Staff member can now login with the created credentials

## Step 10: Review Analytics

1. Navigate to `/{slug}/admin/analytics`
2. See 4 KPI cards: Total Leads, Total Appointments, Conversion Rate, Completion Rate
3. Lead Funnel: horizontal progress bars per stage
4. Service Leaderboard: ranked by bookings
5. Trends: SVG line charts for last 30 days
6. Escalation Health: total, resolved, resolution rate

## Step 11: Handle Notifications

1. Due to notification bell in the admin header with unread count badge
2. Click bell → right-side drawer opens
3. See list of notifications with title, message, timeago
4. Click "Read" on a single notification to mark it read
5. Click "Mark all read" to dismiss all
6. Bell badge updates every 30 seconds via polling

---

# Part 6 — Staff Journey

## Step 1: Login

1. Same login as owner: `https://nevuraos.vercel.app/login`
2. Redirected to `/{slug}/admin`
3. Membership check validates staff role is 'staff' (not 'owner')

## Step 2: View Dashboard

1. Same dashboard as owner: lead funnel, attention required, today's appointments, open leads, pending escalations, activity feed, quick actions
2. **No visible difference from owner's dashboard**

## Step 3: Manage Leads

1. Navigate to `/{slug}/admin/leads`
2. Search, filter by lifecycle state
3. Click "Qualify" or "Lost" on any lead
4. Click lead name to view full 360° detail page
5. **Same capabilities as owner**

## Step 4: Manage Appointments

1. Navigate to `/{slug}/admin/appointments`
2. Filter by status
3. Confirm pending appointments
4. Complete confirmed appointments
5. Cancel any non-completed appointment
6. Reschedule confirmed appointments (inline datetime picker)
7. **Same capabilities as owner**

## Step 5: Resolve Escalations

1. Navigate to `/{slug}/admin/escalations`
2. Filter pending/resolved
3. Click "Resolve" on pending escalation
4. Enter optional resolution note
5. Click "Resolve" to confirm
6. **Same capabilities as owner**

## Step 6: View Analytics

1. Navigate to `/{slug}/admin/analytics`
2. See all metrics: KPIs, funnel, service leaderboard, trends, escalation health
3. **Same view as owner**

## What Staff Cannot Do (Explicitly Blocked)

- **Settings mutations:** All input fields disabled in settings tabs. Backend `requireOwner()` returns 403.
- **Team management:** Invite, promote, remove, change status buttons hidden. Backend `requireOwner()` returns 403.
- **Delete anything:** No delete operations available.
- **No visual indication** that they are staff vs owner in the UI (settings inputs are simply disabled).

---

# Part 7 — Customer Journey

## Step 1: Visit Website

1. Navigate to `/{slug}` (e.g. `https://nevuraos.vercel.app/brightsmile`)
2. See business name, description, services grid, FAQ accordion
3. See floating AI chat widget in bottom-right corner

## Step 2: Use AI Receptionist

1. Click chat widget → opens chat interface
2. Type a message (e.g. "Hi, I'd like to know more about your services")
3. Message sent to `POST /api/chat` with sessionId
4. Backend resolveCustomer pipeline:
   - No existing customer found → creates new `customers` row with lifecycle 'New Inquiry'
   - Creates notification: "New Lead Captured — {name} submitted an inquiry."
   - Creates `conversations` row
   - Creates `messages` row for user message
   - Invokes LangGraph agent → detects intent (e.g. 'information')
   - Agent generates reply using business FAQs
   - Saves agent reply as another message
   - Returns reply to chat UI

## Step 3: Become Lead

1. Customer continues chatting
2. Agent detects 'lead_capture' intent → asks for name, email, phone
3. Customer provides contact info
4. Agent updates lifecycle state (e.g. from 'New Inquiry' → 'Information Gathering')
5. Customer profile is enriched with provided details
6. On the business dashboard, this lead now appears in:
   - Dashboard: open leads, lead funnel (New), recent activity
   - Leads page: searchable, filterable
   - Analytics: lead count increases, daily trend updates

## Step 4: Book Appointment

1. Customer requests booking in chat (e.g. "I'd like to book an appointment")
2. Or customer navigates to `/{slug}/book` directly
3. If via web:
   - Step 1: Select service
   - Step 2: Pick date
   - Step 3: Pick time slot
   - Step 4: Enter name, email, phone
   - Step 5: Confirm booking
4. `POST /api/appointments/book` creates:
   - `appointments` row with status 'pending'
   - Updates customer lifecycle to 'Booked'
   - Creates notification: "Appointment Booked — {name} booked an appointment on {time}."
   - Creates calendar event (no-op in current local provider)
5. On business dashboard, this appears in:
   - Today's appointments (if same day)
   - Appointments page: filterable by status
   - Recent activity feed
   - Analytics: appointment count + daily trend

## Step 5: Receive Confirmation

1. Booking flow shows success page at `/{slug}/book/success`
2. Appointment status is 'pending' until staff/owner confirms it
3. When staff confirms from dashboard → notification created: "Appointment Confirmed — Appointment with {name} confirmed."
4. Staff can also complete or cancel

## How Customer Actions Appear in Business Dashboard

| Customer Action | Dashboard Effect | Notification Created |
|---|---|---|
| First chat message | New lead in open leads + funnel | New Lead Captured |
| Provides contact info | Lead enriched with name/email/phone | (none) |
| Books appointment | New appointment in today's list + leads updated to Booked | Appointment Booked |
| Requests escalation | New pending escalation | Escalation Raised |
| Is inactive for 15+ min | Follow-up scheduled (re-engagement) | (none — system internal) |

---

# Part 8 — Data Flow

## Lead Created

**Trigger:** Customer sends first chat message via AI widget and no existing profile found.
**Table changes:**
- `customers` → INSERT (lifecycle_state='New Inquiry', name, email, phone)
- `customer_channels` → INSERT (links channel to customer)
- `conversations` → INSERT (new active conversation)
- `messages` → INSERT (first user message and agent reply)
**Notification created:** `notifications` → INSERT (type='lead_captured', 'New Lead Captured — {name} submitted an inquiry.')
**Dashboard updates:** Lead funnel "New" count increments, open leads refreshes, activity feed updates.
**Analytics updates:** Lead count increments, daily trend increments for today.

## Appointment Booked

**Trigger:** Customer completes booking wizard or agent books via chat.
**Table changes:**
- `appointments` → INSERT (status='pending', customer_id, business_id, service_id, appointment_time)
- `customers` → UPDATE (lifecycle_state='Booked')
- `messages` → INSERT (if booked via chat)
**Notification created:** `notifications` → INSERT (type='appointment_booked', '{name} booked an appointment on {time}.')
**Dashboard updates:** Today's appointments list updates, lead funnel "Won" increments, open leads updates (moved from New/Contacted to Booked lifecycle).
**Analytics updates:** Appointment count increments, daily trend increments.

## Escalation Raised

**Trigger:** AI agent detects escalation intent or customer requests human.
**Table changes:**
- `escalations` → INSERT (status='pending', reason, customer_id, business_id)
- `messages` → INSERT (agent acknowledgment)
**Notification created:** `notifications` → INSERT (type='escalation_raised', '{name} escalated: {reason}')
**Dashboard updates:** Pending escalations count increments, activity feed updates.
**Analytics updates:** Escalation total increments (unresolved).

## Escalation Resolved

**Trigger:** Staff/owner clicks Resolve on escalation in dashboard or escalations page.
**Table changes:**
- `escalations` → UPDATE (status='resolved', resolved_at=NOW(), resolved_by=userId, resolution_note=note)
**Notification created:** `notifications` → INSERT (type='escalation_resolved', 'Escalation for {name} resolved.')
**Dashboard updates:** Pending escalations count decrements.
**Analytics updates:** Resolved count increments, resolution rate recalculates.

## Staff Invited

**Trigger:** Owner invites staff from `/team` or Settings → Team.
**Table changes:**
- `auth.users` → INSERT (via Supabase admin API)
- `staff_profiles` → INSERT (role='staff', status='invited')
**Notification created:** `notifications` → INSERT (type='staff_invited', '{name} was invited as staff.')
**Dashboard updates:** None directly (team page would show new member on next load).
**Analytics updates:** None.

## FAQ Updated

**Trigger:** Owner saves FAQ changes in Settings → FAQs.
**Table changes:**
- `businesses` → UPDATE (faqs column — JSONB array replaced)
**Notification created:** None.
**Dashboard updates:** None.
**Analytics updates:** None.

## Service Disabled

**Trigger:** Owner clicks toggle on a service in Settings → Services.
**Table changes:**
- `services` → UPDATE (is_active=false)
**Notification created:** None.
**Dashboard updates:** None (services not shown on dashboard).
**Other effects:**
- Disappears immediately from `GET /api/public/businesses/:slug/services`
- Disappears from booking flow service selection
- AI agent no longer recommends or books this service
- Analytics: service leaderboard still shows historical bookings

## Appointment Confirmed/Completed/Cancelled

**Trigger:** Staff/owner clicks action button on dashboard or appointments page.
**Table changes:**
- `appointments` → UPDATE (status, updated_at)
- If completed: `customers` → UPDATE (lifecycle_state='Customer')
**Notification created:** `notifications` → INSERT (type='appointment_confirmed/completed/cancelled')
**Dashboard updates:** Today's appointments list refreshes, button states change.
**Analytics updates:** Completed/cancelled counts increment, completion rate recalculates.

## Lead Qualified/Won/Lost

**Trigger:** Staff/owner clicks Qualify/Lost on dashboard or leads page.
**Table changes:**
- `customers` → UPDATE (lifecycle_state, last_interaction_at)
**Notification created:** `notifications` → INSERT (type='lead_qualified/lead_won/lead_lost')
**Dashboard updates:** Lead funnel recalculates, open leads list updates.
**Analytics updates:** Funnel counts change, conversion rate recalculates.

---

# Part 9 — Navigation Guide

## Founder Quick Reference

```
/ops                                    Platform dashboard (stats + recent businesses)
/ops/businesses                         All businesses (searchable)
/ops/businesses/[id]                    Single business detail + owner management
/ops/users                              All users (role-filterable)
/ops/users/[id]                         Single user detail + membership management
/ops/onboarding                         7-step wizard to create new business
/ops/onboarding/success                 Post-onboarding confirmation with URLs
/login                                  Login page
```

## Owner Quick Reference

```
/{slug}/admin                           Operations dashboard
/{slug}/admin/analytics                 Performance metrics
/{slug}/admin/leads                     Lead management (search, filter, qualify)
/{slug}/admin/leads/[id]               Customer 360° view
/{slug}/admin/appointments              Appointment management
/{slug}/admin/escalations               Escalation management
/{slug}/admin/follow-ups                Follow-up tracking
/{slug}/admin/learning-inbox            Knowledge request approval
/{slug}/admin/settings                  Business configuration (6 tabs)
/{slug}/admin/team                      Team management
/{slug}                                 Public business website
/{slug}/book                            Booking wizard
/{slug}/book/success                    Booking confirmation
```

## Staff Quick Reference

Same routes as owner above, except:
- Settings tabs are read-only (inputs disabled)
- Team page is read-only (no invite/promote/remove buttons)

---

# Part 10 — Current Feature Inventory

## Completed

- [x] Public business website (services, FAQs, branding)
- [x] AI receptionist chat widget (conversational agent)
- [x] Booking engine (5-step wizard)
- [x] Customer creation via chat + booking
- [x] Lead lifecycle management (9 states)
- [x] Appointment management (pending → confirmed → completed)
- [x] Appointment rescheduling and cancellation
- [x] Escalation management (raise, resolve with notes)
- [x] Follow-up system (auto-scheduled re-engagement sequences)
- [x] Knowledge request / learning inbox (AI unanswered questions → human approval)
- [x] Industry templates (5 industries with preset services/hours/FAQs)
- [x] Onboarding wizard (creates full tenant from template)
- [x] Supabase Auth (email/password login)
- [x] Session management via SSR cookies
- [x] Founder admin dashboard (/ops)
- [x] Business owner dashboard with lead funnel
- [x] Attention Required section on dashboard
- [x] Notification system (13 event types)
- [x] Notification bell with unread badge + drawer
- [x] Analytics dashboard (KPIs, funnel, services, trends, escalation health)
- [x] Settings CMS (business, services, hours, FAQs, AI, team)
- [x] Team management (invite, promote, remove staff)
- [x] RBAC (super admin, owner, staff)
- [x] API-key backend proxy for legacy endpoints
- [x] Bearer-token auth for operations endpoints
- [x] Rate limiting (200 public / 100 admin per 15 min)
- [x] CORS configuration for known domains
- [x] Escalation resolution tracking (resolved_by, resolution_note)
- [x] Service enable/disable with immediate effect
- [x] Lead search + lifecycle filter
- [x] Appointment status filter + pagination
- [x] Calendar integration interface (stub — local provider)
- [x] Multi-LLM provider support (Groq, OpenAI, Anthropic)
- [x] Abandonment detection + recovery scheduling

## Partially Implemented

- [~] **Recovery channels:** Only web chat channel is implemented. WhatsApp, SMS, and voice channels are stubs that throw "not yet implemented."
- [~] **Calendar integration:** Only a local no-op provider exists. Google Calendar provider interface is defined but not connected.
- [~] **Contact form:** `POST /api/public/businesses/:slug/contact` exists but the frontend contact page at `/{slug}/contact` is not linked from the public site navigation.
- [~] **Founder onboarding records:** `GET /api/onboarding` endpoint exists but the `/ops/onboarding` page in frontend redirects to the wizard, not a records view.
- [~] **Lead detail page:** Customer 360 view loads via legacy API-key proxy, not the new Bearer-token endpoint.

## Not Implemented

- [ ] **Billing / subscriptions** — No payment processing. No plan tiers. No subscription management.
- [ ] **WhatsApp integration** — Stub only. No actual WhatsApp messaging.
- [ ] **SMS integration** — Stub only.
- [ ] **Voice calls** — Stub only. No Twilio or telephony integration.
- [ ] **Email notifications** — No transactional emails (welcome, confirmations, reminders). Owner/staff must log in to see notifications.
- [ ] **Push notifications** — No browser push or mobile push.
- [ ] **Audit logs** — No system-wide audit trail. Lifecycle events are logged but no global audit table.
- [ ] **CRM** — No full customer relationship management (pipelines, stages, deal value, notes beyond lifecycle).
- [ ] **Marketing attribution** — No tracking of how customers found the business.
- [ ] **Revenue analytics** — No income, invoice, or payment data tracked.
- [ ] **Multi-language support** — English only.
- [ ] **Mobile app** — No native app. Responsive web only (mobile sidebar hidden).
- [ ] **Public site customization** — No ability to customize colors, fonts, layout.
- [ ] **Domain customization** — Multi-tenant subdomain routing exists in middleware but not tested/configured.
- [ ] **Data export / CSV** — No export functionality.
- [ ] **Passwordless login / magic link** — Email/password only. No OAuth or magic links.
- [ ] **Staff scheduling** — No staff assignment to appointments.
- [ ] **Customer portal** — No login for customers to view/manage their own appointments.
- [ ] **Waiting list / overbooking** — Not supported.
- [ ] **Coupons / promotions** — Not supported.
- [ ] **Reviews / ratings** — Not supported.
- [ ] **Backup / restore** — No built-in backup tool (database-level only).

---

# Part 11 — Readiness Assessment

## Product Readiness: 6/10

**Strengths:**
- Core loop works: customer → lead → book → appointment → complete
- AI receptionist handles most common inquiries
- Settings CMS is comprehensive for a service business
- Analytics provides actionable metrics

**Gaps:**
- No email/WhatsApp notifications (business-critical for appointment reminders)
- No customer-facing appointment management (can't cancel/reschedule without calling)
- No payment processing (can't collect deposits or payments)
- Recovery channels beyond web chat are stubs (WhatsApp/SMS/voice not working)
- Search/filter is limited (no advanced lead filtering, no date range filtering on dashboard)

## Operational Readiness: 5/10

**Strengths:**
- Daily operations work: dashboard shows what needs attention
- Lead management with lifecycle tracking
- Appointment management with status transitions
- Escalation management with resolution tracking
- Staff can operate independently (full read/write on operations)

**Gaps:**
- No way to contact customers from within the platform (no email/SMS send)
- No calendar sync (appointments live in the system only)
- No backup staff scheduling (everyone sees everything, no shift assignments)
- No offline mode or PWA
- No notification preferences (can't subscribe to specific events)

## Founder Readiness: 4/10

**Strengths:**
- Onboarding wizard creates businesses quickly from templates
- Founder dashboard shows platform-level stats
- Can manage businesses (disable, transfer ownership)
- Can manage users (reset passwords, change roles)

**Gaps:**
- No billing infrastructure — founder cannot charge for the platform
- No usage monitoring — founder cannot see per-business activity levels
- No support ticket system — founder has no way to handle business owner issues
- No email templates — onboarding emails must be sent manually
- No SLA or uptime guarantees
- No way to contact business owners en masse
- No analytics on founder success (business retention, churn)

## Business Owner Readiness: 7/10

**Strengths:**
- Can fully configure business without code
- Can manage team (invite/promote/remove staff)
- Can see analytics to measure performance
- Gets notifications for important events
- Both owner and staff can operate the business daily

**Gaps:**
- No email notifications (must log in to see anything)
- No customer communication tools
- No mobile app
- No payment processing
- No advanced reporting (export, custom date ranges, comparisons)

## Scalability Readiness: 5/10

**Strengths:**
- Multi-business architecture from the start
- Business-scoped queries (no cross-contamination)
- Rate limiting configured
- CORS configured for production domains

**Gaps:**
- No horizontal scaling configuration (single Express process)
- No caching layer (every dashboard load hits the DB with multiple queries)
- Database connection pooling is basic (pg.Pool, no PgBouncer configuration)
- No CI/CD pipeline documented
- No automated tests visible (vitest configured but no test files found)
- No monitoring or observability (no structured logging, no APM)
- No database migration tooling in CI (migrations tracked manually)
- Frontend and backend are separate deploy targets (Vercel + Render) with no coordinated deployment

---

# Part 12 — Founder Manual

## If you disappear for 30 days, what the next operator needs to know:

### Daily Tasks

1. **Check platform health**
   - Visit `https://frontdeskos.onrender.com/health`
   - Verify status is "healthy" and environment is "production"
   - Check timestamp is recent (within last minute)

2. **Monitor new businesses**
   - Login at `/login`
   - Check `/ops` for total businesses count
   - Scan `/ops/businesses` for any with unusual names or missing owners

3. **Handle user issues**
   - Check `/ops/users` for users with 'invited' or 'suspended' status
   - Reset passwords at `/ops/users/[id]` if owners get locked out
   - Transfer ownership at `/ops/users/[id]/transfer-ownership` if an owner leaves

### Weekly Tasks

1. **Review onboarding quality**
   - Check `/ops/onboarding` for recently completed onboardings
   - Verify that each business has an owner assigned
   - Spot-check a few business websites at `/{slug}`

2. **Database maintenance**
   - Log into Supabase dashboard (`https://supabase.com`)
   - Check database size and connection counts
   - Review any failed queries in the query performance tab

3. **LLM provider monitoring**
   - Check Groq API usage dashboard (or active provider)
   - Verify API keys haven't expired
   - Monitor response times via backend logs

### Common Workflows

**Onboarding a new client:**
1. Go to `/ops/onboarding`
2. Select industry template
3. Fill in business details
4. Review and publish
5. Note the returned `slug` and `businessId`
6. Go to `/ops/businesses/[businessId]`
7. Assign an owner by providing email and name
8. Share the login URL (`https://nevuraos.vercel.app/login`) and password with the owner
9. Share their admin URL (`https://nevuraos.vercel.app/{slug}/admin`)
10. Share their booking URL (`https://nevuraos.vercel.app/{slug}/book`)

**Handling a forgotten password:**
1. Go to `/ops/users`
2. Find the user (search by email)
3. Click "View" → `/ops/users/[id]`
4. Click "Reset Password" → sends password reset email via Supabase
5. User clicks link in email to set new password

**Transferring business ownership:**
1. Go to `/ops/users/[id]` for the new owner
2. Click "Transfer Ownership"
3. Select the business to transfer
4. Confirm transaction (back-end handles transfer in DB transaction)
5. Previous owner becomes staff (or membership removed)

**Disabling a problematic business:**
1. Go to `/ops/businesses`
2. Find the business by name/slug
3. Click "View" → `/ops/businesses/[id]`
4. Toggle status to "disabled"
5. Business website immediately shows 404, AI receptionist stops, booking engine stops

### Common Mistakes

1. **Not assigning an owner after onboarding** — The onboarding wizard creates the business but not the owner. New businesses have no one to log in. Always assign an owner immediately.
2. **Reusing slugs** — The system checks slug availability, but if two founders are onboarding simultaneously, the second will get an error. Retry with a different slug.
3. **Not communicating passwords** — The system creates auth users but does NOT send welcome emails. You must manually communicate the password to the new owner/staff.
4. **Using the wrong API key for deployment** — The `ADMIN_API_KEY` is hardcoded in multiple places. If changed in one place but not another, the API-key proxy breaks. All instances must match.
5. **Running migrations on production** — Migrations are SQL files, not automated. Run them manually in Supabase SQL Editor. Forgetting to run migration 005 will break escalation resolution. Forgetting migration 006 will break notifications.

### Things to Verify Before Onboarding a Client

- [ ] Supabase project is running and not paused
- [ ] Backend (`https://frontdeskos.onrender.com`) returns healthy status
- [ ] Frontend (`https://nevuraos.vercel.app`) loads the marketing page
- [ ] All 6 migrations have been run in Supabase SQL Editor
- [ ] LLM provider API key is valid and has quota
- [ ] Frontend environment variables point to the correct Supabase project
- [ ] Backend environment variables have the correct Supabase URL and keys
- [ ] CORS allows the frontend domain (check `backend/src/app.ts` list)
- [ ] The industry template for the client's business type exists (gym, salon, spa, dental, professional_services)
- [ ] Owner's email is valid (they'll need it to log in)
- [ ] Test the full flow: onboard → assign owner → login → configure → verify public site → book appointment → check dashboard

### Technical Architecture Notes

- **Frontend:** Next.js 15 on Vercel. Deploy by pushing to `main` branch. Build output in `.next/`.
- **Backend:** Express.js on Render. Deploy by pushing to `main` branch. Server starts from `src/index.ts`.
- **Database:** Supabase PostgreSQL (project `dndbfkhrndrcwoknivxt`). Managed via Supabase Dashboard.
- **Auth:** Supabase Auth with email/password. Service role key used for admin operations.
- **LLM:** Groq (default, `llama-3.1-8b-instant`). Also supports OpenAI and Anthropic.
- **Admin API Key:** `fdos_adm_8a3f9c2e1b7d4f6a8c0e2d4b6a8c0e2d` — hardcoded in frontend proxy, backend config, and middleware. Must stay in sync.
- **Supabase anon key:** Hardcoded in frontend client/server/middleware files. Must match Supabase project.
