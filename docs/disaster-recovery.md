# Disaster Recovery Plan

**Last updated:** 2026-06-13
**Contact:** founder@nuvora.io
**RTO Target:** 4 hours
**RPO Target:** 24 hours

**Services:**
- Frontend: Vercel (`nuvoraos.app`, `brightsmile.nuvoraos.app`, `*.nuvoraos.app`)
- Backend: Render (`api.nuvoraos.app` → `nuvoraos-api`)
- Database: Supabase Postgres (`frontdeskos` project, ref `dndbfkhrndrcwoknivxt`)

---

## Scenario 1: Database Restore

### Prerequisites
- Supabase daily backups: Verify enabled via **Supabase Dashboard → Database → Backups**
- Point-in-time recovery (PITR): Available on Supabase Pro plan (not Free). On Free tier, only daily snapshots.
- Confirm the backup exists and is restorable before any incident.

### Recovery Steps

1. **Identify the backup to restore**
   - Go to **Supabase Dashboard → Database → Backups**
   - Choose the most recent backup before the corruption/data loss event
   - Note the timestamp

2. **Create a new Supabase instance (if current instance is compromised)**
   - Create a new Supabase project
   - Do **not** restore into the same project if the corruption is ongoing

3. **Restore the backup**
   - In **Supabase Dashboard → Database → Backups**, click **Restore**
   - Select the target project (new instance or same)
   - Confirm the restore operation
   - Wait for completion (timing depends on DB size; estimate 15–60 min)

4. **Update DATABASE_URL**
   - Get new connection string: **Supabase Dashboard → Project Settings → Database → Connection string (URI)**
   - Update `DATABASE_URL` in:
     - **Render Dashboard → nuvoraos-api → Environment Variables**
     - Local `.env` files if needed
   - Use port `6543` (pooler) in production

5. **Verify data integrity**
   - Query `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';` → expect 17
   - Verify seed data: `SELECT name, slug FROM businesses;` → expect known rows
   - Hit `/health` endpoint and confirm DB connectivity

### RPO Consideration
- With daily backups, maximum data loss is 24 hours.
- For tighter RPO, upgrade to Supabase Pro ($25/month) for point-in-time recovery (down to 1-minute granularity).

---

## Scenario 2: Environment Rebuild

Use when all infrastructure (local dev, CI, or deployment environments) needs to be rebuilt from scratch.

### Recovery Steps

1. **Clone the repository**
   ```bash
   git clone git@github.com:your-org/frontdeskos.git
   cd frontdeskos
   ```

2. **Install dependencies**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Restore environment variables**
   - Retrieve from 1Password vault (or approved secrets manager)
   - Copy backend env: `cp backend/.env.example backend/.env` then fill in real values from vault
   - Copy frontend env: `cp frontend/.env.example frontend/.env` then fill in real values from vault
   - Verify keys: `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `DATABASE_URL`, `ADMIN_API_KEY`

4. **Run database migrations**
   ```bash
   cd backend
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres" \
     npm run migrate:up
   ```
   Or apply schema via Supabase SQL Editor if no migration runner is configured.

5. **Build and verify**
   ```bash
   cd backend && npm run build
   cd ../frontend && npm run build
   ```
   Confirm both compile without errors.

6. **Start local dev** (if rebuilding local environment)
   ```bash
   cd backend && npm run dev
   cd ../frontend && npm run dev
   ```
   Verify frontend at `http://localhost:3000` and backend at `http://localhost:4000/health`.

---

## Scenario 3: Deployment Rollback

### Backend (Render)

1. **Navigate to Render Dashboard**
   - Go to [dashboard.render.com](https://dashboard.render.com)
   - Select **nuvoraos-api**

2. **Find the last known good deployment**
   - Click **Deploys** in the left sidebar
   - Review the list of recent deploys
   - Identify the last deploy that passed health checks and was stable

3. **Activate the previous deploy**
   - Click the **...** menu on the right of the target deploy
   - Select **Activate**
   - Render will redeploy that version
   - Wait for the service to become healthy (check `/health` endpoint)

4. **Verify**
   - `curl https://api.nuvoraos.app/health` → expect `{"status":"healthy"}`
   - Test a critical flow (business page load, chat, booking)

### Frontend (Vercel)

1. **Navigate to Vercel Dashboard**
   - Go to [vercel.com](https://vercel.com)
   - Select the project (frontend, likely named `frontdeskos` or `nuvoraos`)

2. **Find the last known good deployment**
   - Click **Deployments** in the top navigation
   - Review the list; each deployment has a timestamp and commit hash
   - Identify the last stable production deployment

3. **Promote to Production**
   - Click the **...** menu on the target deployment
   - Select **Promote to Production**
   - Vercel instantly switches the production domain to that deployment
   - No build step — promotion is instantaneous

4. **Verify**
   - Visit `https://nuvoraos.app` — page loads without errors
   - Visit `https://brightsmile.nuvoraos.app` — tenant page loads
   - Check browser console for 404s or CORS errors

### Database Rollback (if needed alongside code rollback)

If a deployment introduced a schema migration that needs reversal:

1. Restore database from backup (see Scenario 1)
2. Ensure the rolled-back code is compatible with the restored schema version
3. Verify data integrity

---

## Emergency Contact

| Role | Contact |
|---|---|
| Incident Response | founder@nuvora.io |

## RTO / RPO Summary

| Scenario | RTO | RPO | Complexity |
|---|---|---|---|
| Database Restore | ~1 hour (backup + restore + env update) | 24 hours (daily backup) | Medium |
| Environment Rebuild | ~2 hours (clone + install + configure) | N/A (code in git) | Low |
| Deployment Rollback (Frontend) | ~5 minutes (instant promotion) | N/A (code version) | Low |
| Deployment Rollback (Backend) | ~15 minutes (activate + health check) | N/A (code version) | Low |
| Full Infrastructure Restore | ~4 hours | 24 hours | High |
