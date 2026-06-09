# Customer-Facing Mini Website — Design Document

## Architecture

- **Framework**: Next.js App Router with ISR (dynamic rendering for tenant pages)
- **Styling**: Tailwind CSS v4 + shadcn/ui primitives
- **Data fetching**: Server Components for business info (SSR/ISR), Client Components (SWR) for dynamic data (slots, chat)
- **Tenant routing**: Next.js middleware reads `host` header, extracts subdomain, rewrites to `/[businessSlug]/*`

## Routing & Tenant Resolution

- Middleware at `src/middleware.ts` extracts subdomain from `Host` header
- Rewrites to `/[slug]/...` where slug is the subdomain
- Fallback: if no subdomain or slug === 'www', show landing page or default clinic
- The `slug` is stored in a new column `slug` on the `businesses` table
- Internally, all APIs use `business_id` (UUID) — slug maps to UUID in server components

## Backend Additions

### Database
- Add `slug VARCHAR(100) UNIQUE NOT NULL` column to `businesses` table
- Add `customer_sessions` table for session-based tracking:
  ```sql
  CREATE TABLE customer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```

### Business Repository
- Add `findBySlug(slug: string): Promise<Business | null>`

### Public Endpoints (channel-agnostic)
| Endpoint | Purpose |
|---|---|
| `GET /api/public/businesses/:slug` | Public business info (name, description, address, hours, services) |
| `GET /api/public/businesses/:slug/services` | Public services listing |
| `GET /api/appointments/slots` | Existing — accepts `businessId`, `date`, `serviceId` |
| `POST /api/public/sessions/create` | Create/get customer session, return session_id + customer_id if exists |
| `POST /api/appointments/book` | Existing — but enhanced to accept `sessionId` for customer auto-resolution |
| `POST /api/chat` | Existing — but enhanced to accept `sessionId` for session tracking |

### Session Tracking Flow
1. First visit: frontend checks for session cookie, if none → calls `POST /api/public/sessions/create`
2. Backend creates `customer_sessions` row with a new UUID, returns it
3. Frontend stores session_id in cookie (httpOnly preferred, JS cookie as fallback)
4. All chat messages and booking requests include `sessionId`
5. Backend uses session to reconnect returning visitors to their previous customer/conversation

## Frontend Structure

```
frontend/src/
├── app/
│   ├── [businessSlug]/
│   │   ├── layout.tsx           # Server component: fetch business, render nav/footer/chat
│   │   ├── page.tsx             # Home — hero, services overview, about, CTA
│   │   ├── services/
│   │   │   └── page.tsx         # Full service listing from API
│   │   ├── book/
│   │   │   └── page.tsx         # 5-step booking wizard (client component)
│   │   └── contact/
│   │       └── page.tsx         # Clinic info + contact form
│   ├── layout.tsx               # Root layout: fonts, metadata, globals
│   ├── not-found.tsx            # 404
│   └── page.tsx                 # Landing/clinic selector
├── components/
│   ├── chat/
│   │   ├── chat-widget.tsx      # Floating chat bubble + sheet panel (embeddable)
│   │   ├── chat-message.tsx     # Single message bubble
│   │   └── chat-input.tsx       # Text input + send button
│   ├── ui/                      # shadcn/ui generated primitives
│   ├── layout/
│   │   ├── header.tsx           # Nav bar (responsive, hamburger on mobile)
│   │   ├── footer.tsx           # Footer with business info
│   │   └── mobile-nav.tsx       # Mobile drawer nav
│   ├── home/
│   │   ├── hero.tsx
│   │   ├── services-overview.tsx
│   │   ├── about-section.tsx
│   │   └── cta-banner.tsx
│   ├── services/
│   │   └── service-card.tsx
│   ├── booking/
│   │   ├── step-service.tsx
│   │   ├── step-date.tsx
│   │   ├── step-time.tsx
│   │   ├── step-info.tsx
│   │   └── step-confirm.tsx
│   └── contact/
│       ├── business-info.tsx
│       └── contact-form.tsx
├── lib/
│   ├── api.ts                   # Existing + new public API functions
│   └── session.ts               # Session cookie management
├── hooks/
│   ├── use-business.ts          # SWR: GET /api/public/businesses/:slug
│   ├── use-services.ts          # SWR: GET /api/public/businesses/:slug/services
│   └── use-availability.ts      # SWR: GET /api/appointments/slots
└── middleware.ts                 # Subdomain → slug rewrite
```

## Chat Widget Architecture (Embeddable)

- Built as a self-contained client component in `src/components/chat/`
- Uses shadcn/ui `Sheet` for the slide-out panel
- Maintains in-memory message history (no persistence needed)
- Communicates via `POST /api/chat` with the existing API
- Session ID from `lib/session.ts` passed as `channelIdentity`
- For embedding in external sites (future):
  - Exported as a standalone build via a separate bundler config
  - Loaded via `<script>` tag, renders into a `<div id="fdos-chat">`
  - Uses Scoped CSS / Shadow DOM to avoid host page style conflicts

## Color Theme & Design System

- **Primary**: Tailwind slate/blue palette (professional, healthcare-appropriate)
- **Accent**: Teal/cyan for CTAs and highlights
- **Typography**: Inter (headings) + system sans-serif (body)
- **Components**: shadcn/ui's default style with custom CSS variables
- **Layout**: Max-width container (1280px), centered
- **Responsive**: Mobile-first, breakpoints at sm/md/lg

## Booking Flow (5-Step Wizard)

1. **Select Service** — cards showing name, duration, price range
2. **Pick Date** — date picker (next 30 days, blocked days from availability)
3. **Pick Time** — time slot grid from `GET /api/appointments/slots`
4. **Your Info** — name, email, phone (captured for customer creation)
5. **Confirm** — summary of selections, customer info, book via API

State managed with `useReducer` — stores `{ step, service, date, time, customerInfo }`. Client-only. On confirm: resolve/create customer → book appointment → show success.

## Post-Implementation Verification

- Backend: `npx tsc --noEmit` passes
- All states handled: loading (skeleton), empty, error (retry), success
