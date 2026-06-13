# Nevura — Deployment Guide

**Last updated:** 2026-06-09
**Target:** Production launch

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   DNS                            │
│  nevuraos.app → Vercel (Frontend)           │
│  brightsmile.nevuraos.app → Vercel          │
│  api.nevuraos.app → Render (Backend)        │
└──────────────────────┬──────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌──────────────────┐    ┌──────────────────────┐
│   Vercel          │    │   Render (Web Service)│
│   Next.js SSR     │    │   Express API         │
│   Public pages    │───►│   LangGraph Agent     │
│   Chat widget     │    │   LLM Integration     │
│   Admin dashboard │    │   Recovery Engine     │
│   Booking flow    │    │   Cron: Follow-ups    │
└──────────────────┘    └──────────┬──────────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │   Supabase Postgres   │
                        │   (Managed DB)        │
                        └──────────────────────┘


Multi-tenant routing (via Vercel + Next.js middleware):
  brightsmile.nevuraos.app  →  /brightsmile-dental/*
  (next tenant).nevuraos.app → /{slug}/*
```

---

## Part 1: Supabase Database Setup

### Step 1.1 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Name: `frontdeskos`
3. Database password: **save this securely** — needed for `DATABASE_URL`
4. Region: choose closest to your users (e.g., `us-west-1`)
5. Wait for provisioning (~2 minutes)

### Step 1.2 — Get Connection URI

1. Supabase Dashboard → **Project Settings** → **Database**
2. Find **Connection string** → **URI**
3. Copy: `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres`
   - Port `6543` uses Supabase's connection pooler (recommended)
   - Port `5432` is direct connection

### Step 1.3 — Apply Schema

1. Supabase Dashboard → **SQL Editor**
2. Open [`database/schema.sql`](../database/schema.sql) from this repo
3. Paste and run the **entire file** (creates 17 tables, enums, triggers, indexes, RLS, seed data)
4. Verify: `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';` → expect 17

### Step 1.4 — Apply BrightSmile Seed

1. Open [`database/seed-brightsmile.sql`](../database/seed-brightsmile.sql)
2. Paste and run in SQL Editor
3. Verify: `SELECT name, slug FROM businesses;` → expect 2 rows (Apex Dental + BrightSmile)

### Step 1.5 — Get Supabase API Keys

**Project Settings** → **API**:
| Key | Value | Used As |
|---|---|---|
| Project URL | `https://[PROJECT_REF].supabase.co` | `SUPABASE_URL` |
| `service_role` key | `eyJhbGciOi...` | `SUPABASE_SERVICE_ROLE_KEY` |

---

## Part 2: Backend Deployment (Render)

### Step 2.1 — Create Web Service

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New +** → **Web Service**
2. Connect your GitHub repository
3. Configure:

| Field | Value |
|---|---|
| Name | `nevuraos-api` |
| Region | `Oregon` |
| Branch | `main` |
| Runtime | `Node` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Plan | Starter ($7/month) or higher |
| Health Check Path | `/health` |

### Step 2.2 — Environment Variables (Render)

In **Environment** → **Environment Variables** (Advanced), add:

```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
LLM_PROVIDER=groq
GROQ_API_KEY=[your-groq-api-key]
GROQ_MODEL=llama-3.3-70b-versatile
ADMIN_API_KEY=[run: openssl rand -hex 32]
FRONTEND_URL=https://nevuraos.app
```

### Step 2.3 — Deploy & Verify

1. Click **Create Web Service** — Render builds and deploys automatically
2. Once live, visit: `https://nevuraos-api.onrender.com/health`
3. Expected:
```json
{"status":"healthy","timestamp":"...","environment":"production","provider":"groq"}
```

### Step 2.4 — Custom Domain

1. Render Dashboard → `nevuraos-api` → **Settings** → **Custom Domain**
2. Add: `api.nevuraos.app`
3. At your DNS provider:

| Type | Name | Target |
|---|---|---|
| CNAME | `api` | `nevuraos-api.onrender.com` |

4. Wait for SSL (auto-provisioned, ~1 minute)

---

## Part 3: Frontend Deployment (Vercel)

### Step 3.1 — Import Project

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import your GitHub repository
3. Framework automatically detected as **Next.js**

### Step 3.2 — Configure Domains (Before Deploy)

**Project Settings** → **Domains**:
- Add: `nevuraos.app` (primary)
- Add: `brightsmile.nevuraos.app`

Vercel will provide DNS records to configure at your registrar.

### Step 3.3 — DNS Records

| Type | Name | Value |
|---|---|---|
| A | `@` | `76.76.21.21` (Vercel IP) |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `brightsmile` | `cname.vercel-dns.com` |

### Step 3.4 — Environment Variables (Vercel)

**Project Settings** → **Environment Variables**:

```
NEXT_PUBLIC_API_URL=https://api.nevuraos.app/api
```

Add to **Production** only.

### Step 3.5 — Deploy

1. Click **Deploy**
2. Wait for build (~2 minutes)
3. Verify: `https://nevuraos.app` → Landing page loads
4. Verify: `https://brightsmile.nevuraos.app` → BrightSmile Dental loads

---

## Part 4: Required Code Changes

### 4.1 — Update `next.config.ts` for Production

```typescript
// frontend/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  async rewrites() {
    return [
      // Multi-tenant subdomain rewrites — maps brightsmile.nevuraos.app
      // to /brightsmile-dental/* (handled by middleware.ts)
    ];
  },
};

export default nextConfig;
```

### 4.2 — Update CORS for Multi-Domain

In `backend/src/app.ts`, update the CORS origin to accept both domains:

```typescript
if (config.NODE_ENV === 'production') {
  app.use(cors({
    origin: [
      'https://nevuraos.app',
      'https://brightsmile.nevuraos.app',
      // Add future tenant domains here
    ],
    credentials: true,
  }));
} else {
  app.use(cors());
}
```

### 4.3 — Configure Production Logging (Optional)

In `backend/src/index.ts`, add startup logging:

```typescript
const server = app.listen(config.PORT, () => {
  console.log(JSON.stringify({
    event: 'server_start',
    port: config.PORT,
    environment: config.NODE_ENV,
    provider: config.LLM_PROVIDER,
    frontendUrl: process.env.FRONTEND_URL,
  }));
});
```

---

## Part 5: Environment Variable Reference

### Backend (Render)

| Variable | Required | Source | Notes |
|---|---|---|---|
| `NODE_ENV` | Yes | Static | Set to `production` |
| `PORT` | Yes | Render | Automatically assigned (usually 10000) |
| `DATABASE_URL` | Yes | Supabase → Project Settings → Database | Use port `6543` for pooler |
| `SUPABASE_URL` | Yes | Supabase → Project Settings → API | Format: `https://[ref].supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase → Project Settings → API | `service_role` key, not `anon` |
| `LLM_PROVIDER` | Yes | Static | `groq` recommended |
| `GROQ_API_KEY` | Conditional | console.groq.com | Required if `LLM_PROVIDER=groq` |
| `GROQ_MODEL` | No | Static | Default: `llama3-70b-8192` |
| `ADMIN_API_KEY` | Yes | Generate: `openssl rand -hex 32` | Used for admin API auth |
| `FRONTEND_URL` | Yes | Your domain | `https://nevuraos.app` |

### Frontend (Vercel)

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `https://api.nevuraos.app/api` |

### Optional Variables

| Variable | Platform | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Render | Alternative LLM provider |
| `ANTHROPIC_API_KEY` | Render | Alternative LLM provider |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | Future client-side Supabase usage |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | Future client-side Supabase usage |

---

## Part 6: Startup Sequence Verification

### Step-by-step startup order:

```
1. DNS resolves nevuraos.app → Vercel
2. DNS resolves api.nevuraos.app → Render
3. Render starts Express:
   a. Loads .env (dotenv)
   b. Validates all env vars via Zod schema
   c. Connects to Supabase Postgres (pg.Pool)
   d. Registers middleware (CORS, rate-limit, JSON parse, auth)
   e. Mounts routes (public, chat, admin, appointments, etc.)
   f. Listens on PORT
   g. /health returns 200
4. Vercel serves Next.js:
   a. Client requests nevuraos.app
   b. Next.js server-renders layout
   c. Layout calls getBusiness(slug) → fetch(api.nevuraos.app/api/public/businesses/{slug})
   d. API returns business data
   e. Page renders with Hero, Services, CTA
   f. Client-side ChatWidget loads
   g. ensureSession() calls api.nevuraos.app/api/public/sessions/create
   h. Chat is ready
```

### Failure modes:

| Symptom | Likely Cause | Fix |
|---|---|---|
| Backend `/health` returns 500 | Missing env var | Check Render env vars |
| Backend `/health` returns but DB queries fail | `DATABASE_URL` wrong | Verify Supabase connection string |
| Frontend shows "Clinic not found" | Backend unreachable or seed missing | Check `NEXT_PUBLIC_API_URL`, run seed |
| Chat sends but no reply | LLM API key invalid | Check `GROQ_API_KEY` |
| Admin endpoints return 401 | Wrong `x-api-key` header | Verify `ADMIN_API_KEY` match |
| CORS error in browser | `FRONTEND_URL` mismatch | Check Render env var matches exact domain |

---

## Part 7: Smoke Test Checklist

Before announcing launch, run through every item:

### 7.1 — Infrastructure

- [ ] `https://api.nevuraos.app/health` returns 200 with `"status":"healthy"`
- [ ] `https://nevuraos.app` loads without errors
- [ ] `https://brightsmile.nevuraos.app` loads the BrightSmile Dental page
- [ ] SSL certificate valid on all 3 domains
- [ ] No console errors (404, CORS, mixed content)

### 7.2 — Chat Flow

- [ ] Click "Chat With Us" opens chat widget
- [ ] "Hi, how much for whitening?" returns a pricing reply
- [ ] "I'd like to book a cleaning" starts the booking flow
- [ ] Messages persist on page reload

### 7.3 — Booking Flow

- [ ] Navigate to `https://brightsmile.nevuraos.app/book`
- [ ] Step 1: Select a service
- [ ] Step 2: Pick a date
- [ ] Step 3: Pick a time
- [ ] Step 4: Enter name, email, phone
- [ ] Step 5: Confirm → success page
- [ ] Verify appointment in database: `SELECT * FROM appointments;`

### 7.4 — Admin Dashboard

- [ ] `https://brightsmile.nevuraos.app/admin` loads
- [ ] Dashboard summary shows correct lead counts
- [ ] Leads page lists customers
- [ ] Appointments page shows bookings
- [ ] Learning Inbox shows knowledge requests (if any)

### 7.5 — API Endpoints

- [ ] `GET /api/public/businesses/brightsmile-dental` returns full profile
- [ ] `GET /api/public/businesses/brightsmile-dental/services` returns 5 services
- [ ] `POST /api/public/sessions/create` returns sessionId
- [ ] `GET /api/appointments/slots?businessId={id}&date={today}` returns slots
- [ ] `POST /api/appointments/book` creates appointment

### 7.6 — Tenant Isolation

- [ ] `GET /api/leads?businessId={brightsmile-id}` returns only BrightSmile customers
- [ ] `GET /api/leads?businessId={apex-id}` returns only Apex customers
- [ ] BrightSmile dashboard doesn't show Apex data

### 7.7 — Error Handling

- [ ] Unknown business slug returns 404 with friendly message
- [ ] Invalid appointment time returns validation error
- [ ] Unauthenticated admin requests return 401

---

## Part 8: Launch Checklist

### Pre-Launch (24 hours before)

- [ ] **DNS propagation verified**: `dig nevuraos.app` returns Vercel IPs
- [ ] **DNS propagation verified**: `dig api.nevuraos.app` returns Render IP
- [ ] **SSL certificates**: All 3 domains show valid HTTPS in browser
- [ ] **Database**: Schema applied, seed data loaded, backup configured
- [ ] **LLM API key**: Tested with a real chat message
- [ ] **Admin API key**: Generated and stored in password manager
- [ ] **Environment variables**: All set on both Render and Vercel
- [ ] **Build succeeds**: Both frontend and backend build without errors

### Pre-Launch (12 hours before)

- [ ] **Smoke test**: Run through every item in Part 7
- [ ] **Rate limiting**: Verify admin endpoints respect limits
- [ ] **CORS**: Test API calls from both domains
- [ ] **Error pages**: Test 404, 500 scenarios
- [ ] **Mobile**: Test frontend on mobile browser
- [ ] **Load test**: 10 concurrent chat messages (optional but recommended)
- [ ] **Rollback plan**: Document how to revert to previous deploy

### Launch Day

- [ ] **Final smoke test**: Full run of Part 7
- [ ] **Monitoring**: Check Render logs for errors
- [ ] **Monitoring**: Check Vercel Analytics for 4xx/5xx
- [ ] **Database**: Check Supabase Logs for slow queries
- [ ] **Announce**: Update DNS TTL to lower value for quick rollback
- [ ] **Go live**: Update A records if needed

### Post-Launch (First 24 hours)

- [ ] **Watch Render logs**: Every 2 hours
- [ ] **Watch Vercel Analytics**: Error rates
- [ ] **Database connections**: Monitor pool usage
- [ ] **LLM costs**: Track API usage
- [ ] **User feedback**: First real customer interaction

### Rollback Procedure

```bash
# Backend: Render deploys previous version
# Dashboard → nevuraos-api → Deploys → Activate last known good deploy

# Frontend: Vercel immediately
# Dashboard → frontdeskos → Deployments → [...] → Promote to Production

# Database: Restore from backup
# Supabase Dashboard → Database → Backups → Restore
```

---

## Appendix: Quick Reference Scripts

```bash
# Build backend
cd backend && npm install && npm run build

# Build frontend
cd frontend && npm install && npm run build

# Run migrations (if using migration file instead of schema.sql)
cd backend && DATABASE_URL="postgresql://..." npm run migrate:up

# Generate admin API key
openssl rand -hex 32

# Test health endpoint
curl https://api.nevuraos.app/health

# Test chat
curl -X POST https://api.nevuraos.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"businessId":"b7a2f4c1-d93e-48d6-95bc-79f94eb97220","channelType":"web_chat","channelIdentity":"test-session","content":"Hello"}'

# Test booking
curl -X POST https://api.nevuraos.app/api/appointments/book \
  -H "Content-Type: application/json" \
  -d '{"businessId":"b7a2f4c1-d93e-48d6-95bc-79f94eb97220","sessionId":"test-session","serviceId":"svc-b7a2-0001-4000-8000-000000000002","appointmentTime":"2026-06-16T10:00:00.000Z"}'
```

---

## Appendix: Costs

| Service | Plan | Monthly Cost |
|---|---|---|
| Supabase | Free (500 MB DB, 2 GB bandwidth) | $0 |
| Render | Starter ($7/month, 512 MB RAM) | $7 |
| Vercel | Hobby (100 GB bandwidth, unlimited sites) | $0 |
| Groq API | Free tier (30 req/min, 14k req/day) | $0 |
| Domain | ~$10-15/year | ~$1 |
| **Total** | | **~$8/month** |
