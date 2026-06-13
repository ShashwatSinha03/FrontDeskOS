# Customer-Facing Mini Website — Implementation Plan

> **For Claude:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build a multi-tenant, customer-facing mini website for Nevura clinics with Home, Services, Book Appointment, Contact pages, embeddable chat widget, and session-based customer tracking.

**Architecture:** Next.js App Router with middleware-based subdomain routing. Server Components for business data, client components with SWR for dynamic data. Backend additions: slug-based business lookup, customer session tracking, public API endpoints.

**Tech Stack:** Next.js 15, Tailwind CSS v4, shadcn/ui, SWR, Express.js (backend), PostgreSQL (Supabase)

---

### Task 1: Backend — Database schema additions

**Files:**
- Modify: `database/schema.sql` — add slug column + customer_sessions table + seed data

**Step 1: Add slug column to businesses**

Add after `name VARCHAR(255) NOT NULL`:
```sql
slug VARCHAR(100) UNIQUE NOT NULL,
```

Add index:
```sql
CREATE INDEX idx_businesses_slug ON businesses(slug);
```

**Step 2: Add customer_sessions table**

After calendar_credentials table:
```sql
CREATE TABLE IF NOT EXISTS customer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_sessions_session ON customer_sessions(session_id);
CREATE INDEX idx_customer_sessions_business ON customer_sessions(business_id);
```

Add RLS policies:
```sql
ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY anon_insert_sessions ON customer_sessions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY anon_read_own_sessions ON customer_sessions
  FOR SELECT TO anon USING (
    session_id = current_setting('app.session_id', true)
  );
```

Add trigger for updated_at.

**Step 3: Update seed data — add slug**

Modify seed INSERT for Apex Dental Care:
```sql
INSERT INTO businesses (id, name, slug, ...)
VALUES ('d4a6f7b1-...', 'Apex Dental Care', 'apex-dental', ...)
```

---

### Task 2: Backend — BusinessRepository.findBySlug

**Files:**
- Modify: `backend/src/repositories/business.repository.ts`

Add method:
```typescript
async findBySlug(slug: string): Promise<Business | null> {
  const query = `
    SELECT id, name, slug, business_type, archetype, faqs, escalation_rules, appointment_settings, created_at, updated_at
    FROM businesses
    WHERE slug = $1
  `;
  const res = await pool.query(query, [slug]);
  if (res.rows.length === 0) return null;
  return this.mapToEntity(res.rows[0]);
}
```

Add `slug` to Business type and mapToEntity.

---

### Task 3: Backend — Public endpoints controller

**Files:**
- Create: `backend/src/controllers/public.controller.ts`
- Modify: `backend/src/routes/api.routes.ts`

**PublicController:**
- `getBusinessBySlug(req, res)` — GET `/api/public/businesses/:slug` — returns public business info (name, description, faqs, services)
- `getServices(req, res)` — GET `/api/public/businesses/:slug/services` — returns services list
- `createSession(req, res)` — POST `/api/public/sessions/create` — creates or returns existing session, accepts `{ businessId, sessionId? }`

**Routes to add:**
```typescript
router.get('/public/businesses/:slug', (req, res) => publicController.getBusinessBySlug(req, res));
router.get('/public/businesses/:slug/services', (req, res) => publicController.getServices(req, res));
router.post('/public/sessions/create', (req, res) => publicController.createSession(req, res));
```

---

### Task 4: Backend — Enhance booking & chat for session support

**Files:**
- Modify: `backend/src/controllers/appointment.controller.ts` — book method accepts `sessionId`
- Modify: `backend/src/services/chat.service.ts` — handleMessage accepts `sessionId`

**Appointment book enhancement:**
- Accept `sessionId` in body
- If `sessionId` provided but no `customerId`, resolve customer from session

**Chat service enhancement:**
- Accept `sessionId` in ChatMessageInput
- After resolving/creating customer, link session to customer

---

### Task 5: Frontend — Initialize Next.js project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/next.config.js`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Create: `frontend/.env.local`

Run:
```bash
cd frontend
npm init -y
npm install next react react-dom swr @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react
npm install -D typescript @types/node @types/react @types/react-dom tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Set up tsconfig, next.config, tailwind.config.

---

### Task 6: Frontend — shadcn/ui setup & primitives

**Files:**
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/components.json` (shadcn config)
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/components/ui/card.tsx`
- Create: `frontend/src/components/ui/input.tsx`
- Create: `frontend/src/components/ui/sheet.tsx`
- Create: `frontend/src/components/ui/badge.tsx`
- Create: `frontend/src/app/globals.css`
- Create: `frontend/src/app/layout.tsx`

Set up shadcn/ui style primitives based on their component source.

---

### Task 7: Frontend — Middleware + Session management

**Files:**
- Create: `frontend/src/middleware.ts`
- Create: `frontend/src/lib/session.ts`
- Create: `frontend/src/lib/api-public.ts`

**Middleware:** reads `host` header, extracts subdomain, rewrites to `/[slug]/*`

**Session:** generates UUID, stores in cookie, exports `getSessionId()`, `initSession()`

**API Public:** wraps existing api.ts with public endpoints + session injection

---

### Task 8: Frontend — Layout components

**Files:**
- Create: `frontend/src/app/[businessSlug]/layout.tsx`
- Create: `frontend/src/app/[businessSlug]/page.tsx` (Home page)
- Create: `frontend/src/components/layout/header.tsx`
- Create: `frontend/src/components/layout/footer.tsx`
- Create: `frontend/src/components/layout/mobile-nav.tsx`

**Layout:** Server component that fetches business by slug, renders Header + main + Footer + ChatWidget children.

**Header:** Logo, nav links (Home, Services, Book Appointment, Contact), mobile hamburger menu.

**Footer:** Business name, address, phone, email, social links, copyright.

---

### Task 9: Frontend — Home page

**Files:**
- Create: `frontend/src/components/home/hero.tsx`
- Create: `frontend/src/components/home/services-overview.tsx`
- Create: `frontend/src/components/home/about-section.tsx`
- Create: `frontend/src/components/home/cta-banner.tsx`

**Home page:** Hero section (clinic name + tagline + CTA to book), services overview (first 3-4 services), about section, CTA banner.

---

### Task 10: Frontend — Services page

**Files:**
- Create: `frontend/src/app/[businessSlug]/services/page.tsx`
- Create: `frontend/src/components/services/service-card.tsx`

**Services page:** Fetches services from API, renders grid of service cards. Each card shows name, description, price range, duration. Click navigates to book page with service pre-selected.

---

### Task 11: Frontend — Book Appointment page (5-step wizard)

**Files:**
- Create: `frontend/src/app/[businessSlug]/book/page.tsx`
- Create: `frontend/src/components/booking/step-service.tsx`
- Create: `frontend/src/components/booking/step-date.tsx`
- Create: `frontend/src/components/booking/step-time.tsx`
- Create: `frontend/src/components/booking/step-info.tsx`
- Create: `frontend/src/components/booking/step-confirm.tsx`

**Wizard:** 5 steps managed by useReducer. Step 1: select service. Step 2: pick date (next 30 days). Step 3: pick time slot. Step 4: enter name/email/phone. Step 5: review and confirm. On confirm: resolve customer via session → book appointment.

---

### Task 12: Frontend — Contact page

**Files:**
- Create: `frontend/src/app/[businessSlug]/contact/page.tsx`
- Create: `frontend/src/components/contact/business-info.tsx`
- Create: `frontend/src/components/contact/contact-form.tsx`

**Contact page:** Business info card (address, phone, email, hours) + simple contact form (name, email, message).

---

### Task 13: Frontend — Chat Widget

**Files:**
- Create: `frontend/src/components/chat/chat-widget.tsx`
- Create: `frontend/src/components/chat/chat-message.tsx`
- Create: `frontend/src/components/chat/chat-input.tsx`
- Create: `frontend/src/components/chat/chat-context.tsx`

**Widget:** Floating button (bottom-right), click opens Sheet panel. In-memory message list, typing indicator, sends via `POST /api/chat` with session_id as channelIdentity. Designed as self-contained client component.

---

### Task 14: Frontend — Landing page + 404

**Files:**
- Create: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/not-found.tsx`

**Landing:** Simple listing or redirect for root domain (no subdomain). Lists available clinics or shows a generic landing.

**404:** Friendly not-found page with link to home.
