# Environment Variable Audit

**Date:** 2026-06-13
**Scope:** All env vars consumed by `backend/src/config/index.ts` (Zod schema) + frontend `.env` references.

---

## Server

| Variable | Service | Purpose | Required | Current Value Source | Notes |
|---|---|---|---|---|---|
| `PORT` | Backend (Render) | Express listen port | Yes (startup, default 4000) | Render assigns 10000 in prod; `.env.example` shows `4000` for dev | Zod defaults to `4000` if unset |
| `NODE_ENV` | Backend | Runtime mode: development, production, test | Yes (startup, default `development`) | `.env.example` = `development` | Must be explicitly set to `production` on Render |
| `FRONTEND_URL` | Backend | CORS allowed origin | Production-only | Deployment guide only; **missing from `.env.example`** | Should be added to `.env.example` |

## Database

| Variable | Service | Purpose | Required | Current Value Source | Notes |
|---|---|---|---|---|---|
| `DATABASE_URL` | Backend (Supabase Postgres) | pg.Pool connection string | **Yes (startup, Zod required_error)** | `.env.example` shows `postgresql://postgres:postgres@localhost:5432/frontdeskos` (local dev) | Must switch to Supabase pooler URI (port 6543) in production |
| `SUPABASE_URL` | Backend | Supabase admin client URL | **Yes (startup, Zod .url())** | `.env.example` = `https://your-supabase-project.supabase.co` | Replace with actual project ref |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Admin bypass (RLS override) | **Yes (startup, Zod required_error)** | `.env.example` = `your-supabase-service-role-key` | **Secret** — never expose client-side |
| `SUPABASE_ANON_KEY` | Backend | Client-side auth validation | **Yes (startup, Zod required_error)** | **Missing from `.env.example`** (but validated by config) | Either add to `.env.example` or demote to optional in Zod schema |

## AI Providers

| Variable | Service | Purpose | Required | Current Value Source | Notes |
|---|---|---|---|---|---|
| `LLM_PROVIDER` | Backend | Selects active LLM: groq, openai, anthropic | Yes (startup, default `groq`) | `.env.example` = `groq` | Runtime switch; provider must have its API key set |
| `GROQ_API_KEY` | Backend | Authentication for Groq API | Conditional (required if `LLM_PROVIDER=groq`) | `.env.example` = `your_groq_api_key` | Zod `.refine()` enforces provider-key match |
| `GROQ_MODEL` | Backend | Groq model identifier | No (default `llama-3.3-70b-versatile`) | `.env.example` sets it | Overridable per-business in future |
| `OPENAI_API_KEY` | Backend | Authentication for OpenAI API | Conditional (required if `LLM_PROVIDER=openai`) | `.env.example` = empty string | Future-proofing; currently unused |
| `OPENAI_MODEL` | Backend | OpenAI model identifier | No (default `gpt-4o`) | `.env.example` sets it | Future-proofing |
| `ANTHROPIC_API_KEY` | Backend | Authentication for Anthropic API | Conditional (required if `LLM_PROVIDER=anthropic`) | `.env.example` = empty string | Future-proofing |
| `ANTHROPIC_MODEL` | Backend | Anthropic model identifier | No (default `claude-3-5-sonnet-20240620`) | `.env.example` sets it | Future-proofing |

## Auth

| Variable | Service | Purpose | Required | Current Value Source | Notes |
|---|---|---|---|---|---|
| `ADMIN_API_KEY` | Backend | Authenticates admin/ops dashboard requests via `x-api-key` header | Yes (startup, default `dev-api-key-change-in-production`) | `.env.example` = `dev-api-key-change-in-production` | **Must generate strong key for production** (`openssl rand -hex 32`) |

## Frontend

| Variable | Service | Purpose | Required | Current Value Source | Notes |
|---|---|---|---|---|---|
| `PORT` | Frontend (Next.js) | Dev server port | Development-only | `.env.example` = `3000` | Next.js defaults to 3000; not used in Vercel production |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend API base URL for client-side fetch | **Yes (production)** | `.env` = `https://frontdeskos.onrender.com/api` | Must point to Render backend; currently references old Render URL (frontdeskos, not nevuraos-api) |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend | Future client-side Supabase client | Future | `.env` = `https://dndbfkhrndrcwoknivxt.supabase.co` | Not consumed by any current code; for future `@supabase/supabase-js` usage |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | Future client-side Supabase anon key | Future | `.env` = `eyJhbGciOi...` (anon key) | Not consumed by any current code; for future client-side auth |
| `NODE_ENV` | Frontend | Next.js runtime environment | No | Next.js sets automatically | Not in `.env.example`; Vercel injects automatically |

---

## Gaps & Recommendations

| Gap | Impact | Recommendation |
|---|---|---|
| `SUPABASE_ANON_KEY` validated by Zod but absent from `.env.example` | Local dev startup fails if using `.env.example` directly | Add to `.env.example` or mark optional in Zod |
| `FRONTEND_URL` used in deployment guide but not in `.env.example` | Easy to miss in production setup | Add to `.env.example` with a comment |
| `NEXT_PUBLIC_API_URL` in `.env` points to `frontdeskos.onrender.com` (old service name) | May break if old Render service is decommissioned | Update to `https://api.nevuraos.app/api` |
| Backend `.env.example` defines `SUPABASE_SERVICE_ROLE_KEY` but not `SUPABASE_ANON_KEY` | Anon key must be obtained separately | Document both keys in `.env.example` |
| AI provider API keys stored as empty strings in `.env.example` | Safe, but could cause confusion | Comment each as `# Required if LLM_PROVIDER=<provider>` |
