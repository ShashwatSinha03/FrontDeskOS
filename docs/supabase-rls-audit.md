# Supabase RLS Security Audit

**Date:** 2026-06-18
**Scope:** 6 tables reported by Security Advisor as having RLS disabled
**Goal:** Determine whether warnings are legitimate risks, false positives, or intentional design

---

## Part 1 — Table Inventory

| # | Table | Schema Source | Has `business_id`? | RLS Status | Tenant-Isolated? |
|---|-------|--------------|-------------------|------------|-----------------|
| 1 | `customer_lifecycle_events` | `database/schema.sql` | Yes (FK, NOT NULL) | ✅ **ENABLED** (SELECT only) | Yes |
| 2 | `business_channels` | Migration `1728000000000` | Yes (FK, NOT NULL) | ❌ Not defined | Yes (app-layer) |
| 3 | `notifications` | `006_notifications.sql` + migration `1731000000000` | Yes (FK, NOT NULL) | 🚫 **Explicitly DISABLED** | Yes (app-layer) |
| 4 | `message_deliveries` | Migration `1729000000000` | Yes (FK, NOT NULL) | ❌ Not defined | Yes (app-layer) |
| 5 | `conversation_workflows` | Migration `1730000000000` | **No** | ❌ Not defined | Indirect via `conversation_id` FK |
| 6 | `pgmigrations` | Auto-created by `node-pg-migrate` | No (global) | N/A | Not applicable |

> **Correction:** Security Advisor reports RLS disabled on `customer_lifecycle_events` but it IS enabled with a SELECT policy. The warning may be stale or checking a different state.

---

## Part 2 — Access Pattern Matrix

### Table: `customer_lifecycle_events`

| Operation | Who | How | Auth Context |
|-----------|-----|-----|-------------|
| SELECT | `LifecycleEventRepository.findByCustomer()` | Backend pool query (service_role) | Authenticated staff via `GET /api/leads/:id` |
| INSERT | PostgreSQL trigger on `customers` table | Auto-inserted by `trg_customer_lifecycle_insert` / `trg_customer_lifecycle_change` | Trigger runs as table owner |
| UPDATE | None | — | — |
| DELETE | None | — | — |

**Direct Supabase access:** ❌ None

### Table: `business_channels`

| Operation | Who | How | Auth Context |
|-----------|-----|-----|-------------|
| SELECT | `BusinessChannelRepository` (5 methods) | Backend pool query | Authenticated staff (`GET /api/settings/channels`), webhook (Twilio) |
| INSERT | `BusinessChannelRepository.insertDefaultChannels()` | Auto-provisioned on first read if empty | Backend init |
| UPDATE | `BusinessChannelRepository` (3 methods) | Backend pool query | Authenticated owner (`PATCH /api/settings/channels/:type`) |
| DELETE | `BusinessChannelRepository.deleteChannel()` | Backend pool query | Backend |

**Direct Supabase access:** ❌ None

### Table: `notifications`

| Operation | Who | How | Auth Context |
|-----------|-----|-----|-------------|
| SELECT | `NotificationRepository.findByBusiness()`, `countUnread()` | Backend pool query | Authenticated staff (`GET /api/notifications`) |
| INSERT | `NotificationService.create()` (via repository) | Backend pool query | Internal (triggered by operational controllers) |
| UPDATE | `NotificationRepository.markRead()`, `markAllRead()` | Backend pool query | Authenticated staff (`PATCH /api/notifications/:id/read`) |
| DELETE | None | — | — |

**Direct Supabase access:** ❌ None

### Table: `message_deliveries`

| Operation | Who | How | Auth Context |
|-----------|-----|-----|-------------|
| SELECT | `MessageDeliveryRepository` (6 methods), `OperationalController` (direct SQL), `FounderController` (direct SQL) | Backend pool query | Authenticated staff, super admin, Twilio webhook |
| INSERT | `MessageDeliveryRepository.createPending()` | Backend pool query | Internal (via `DeliveryService.sendMessage()`) |
| UPDATE | `MessageDeliveryRepository` (markSent/Delivered/Failed) | Backend pool query | Internal + Twilio webhook callback |
| DELETE | None | — | — |

**Direct Supabase access:** ❌ None

### Table: `conversation_workflows`

| Operation | Who | How | Auth Context |
|-----------|-----|-----|-------------|
| SELECT | `ConversationWorkflowRepository.findByConversation()`, `OperationalController` (direct SQL) | Backend pool query | Public chat (`POST /api/chat`), authenticated staff |
| INSERT | `ConversationWorkflowRepository.upsert()` | Backend pool query | Internal (via `WorkflowStateService`) |
| UPDATE | `ConversationWorkflowRepository.upsert()`, `updateCollectedData()` | Backend pool query | Internal (via `WorkflowStateService`) |
| DELETE | `ConversationWorkflowRepository.delete()`, `expireOldWorkflows()` | Backend pool query | Internal |

**Direct Supabase access:** ❌ None

### Table: `pgmigrations`

| Operation | Who | How | Auth Context |
|-----------|-----|-----|-------------|
| All | `node-pg-migrate` CLI tool only | Direct connection via `DATABASE_URL` | Infrastructure (migration runner) |
| Application code | **None** | — | — |

**Direct Supabase access:** ❌ None

---

## Part 3 — Risk Assessment

### Classification Guide

| Classification | Meaning |
|---------------|---------|
| **SAFE_TO_IGNORE** | No tenant data, or only accessible via service_role; RLS adds no value |
| **RLS_RECOMMENDED** | Contains tenant data, but app-layer isolation is already enforced; RLS is defense-in-depth |
| **RLS_REQUIRED** | Contains tenant data AND has a direct frontend/anon access path |

### Table-by-Table Assessment

#### 1. `customer_lifecycle_events` — ✅ **ALREADY PROTECTED**

RLS is enabled with a `FOR SELECT TO authenticated` policy derived from `current_user_business_id()`. Writes are trigger-only. No action needed.

#### 2. `business_channels` — ⚠️ **RLS_RECOMMENDED**

- Contains tenant-scoped channel configuration (provider API keys may be in `config_json`)
- **No direct frontend access** — all queries go through backend (service_role)
- App-layer isolation enforced in every repository method via `WHERE business_id = $1`
- **Risk:** Low. An attacker gaining direct Supabase anon access could read channel configs
- **Mitigation exists:** No frontend code uses supabase.from() on this table
- **Recommendation:** Enable RLS and add a SELECT policy as defense-in-depth

#### 3. `notifications` — ⚠️ **RLS_RECOMMENDED**

- Contains tenant-scoped notifications (titles, messages, entity references)
- **Explicitly disables RLS** (`ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;`)
- No direct frontend access — all queries through backend
- App-layer isolation enforced in every repository method
- **Risk:** Low. Notifications are low-sensitivity (titles + messages)
- **Recommendation:** Remove `DISABLE ROW LEVEL SECURITY` and enable RLS with SELECT policy

#### 4. `message_deliveries` — ⚠️ **RLS_RECOMMENDED**

- Contains tenant-scoped message delivery tracking and provider_message_id (could contain external routing info)
- No direct frontend access
- App-layer isolation enforced in every query
- Webhook (Twilio) access uses service_role directly
- **Risk:** Low. Delivery status records are operational telemetry
- **Recommendation:** Enable RLS with SELECT policy

#### 5. `conversation_workflows` — ⚠️ **RLS_RECOMMENDED** (design concern)

- Contains tenant conversation workflow state and collected data (appointment booking data, personal info)
- **Lacks a `business_id` column** — tenant isolation is indirect through `conversation_id` FK → `conversations` table
- No direct frontend access
- **Design concern:** Cannot write a simple `business_id = current_user_business_id()` policy without adding the column
- **Risk:** Low (no direct frontend path), but the missing `business_id` is a schema concern
- **Recommendation:** Add `business_id` column and enable RLS

#### 6. `pgmigrations` — ✅ **SAFE_TO_IGNORE**

- Internal migration tracking table
- No tenant data, no application access
- Only accessed by migration CLI using `DATABASE_URL` (service_role equivalent)

---

## Part 4 — Compatibility Analysis

### Would enabling RLS break anything?

#### No. Here is why:

| Component | Access Pattern | Would RLS break it? |
|-----------|---------------|-------------------|
| **Website Chat** (public) | `POST /api/chat` → `ChatService` → backend pool query | ❌ No. Backend uses service_role which bypasses RLS |
| **WhatsApp** (webhook) | `POST /api/webhooks/twilio/*` → `WhatsAppWebhookHandler` → backend pool query | ❌ No. Backend uses service_role |
| **Booking** (public) | `POST /api/public/sessions/create` → backend pool query | ❌ No. Backend uses service_role |
| **Workflow Engine** | `WorkflowStateService` → backend pool query | ❌ No. Backend uses service_role |
| **Delivery Tracking** | `DeliveryService` → backend pool query | ❌ No. Backend uses service_role |
| **Founder Dashboard** | `FounderController` → backend pool query | ❌ No. Backend uses service_role |
| **Admin Dashboard** | `NotificationController`, `OperationalController` → backend pool query | ❌ No. Backend uses service_role |

**All database access flows through the backend Node.js service, which connects to PostgreSQL using the service_role key. RLS policies only apply to requests made using the anon key or authenticated key directly from the Supabase client (frontend). Since no frontend code directly queries any of these 6 tables, enabling RLS would affect zero production queries.**

### Services that COULD break if not configured correctly:

| Service | Reason |
|---------|--------|
| **Public Chat** (`POST /api/chat`) | Public endpoint that reads `conversation_workflows`. If an RLS policy restricts access by `business_id`, the service_role connection is unaffected. |
| **Twilio Webhooks** | Reads `business_channels` and `message_deliveries`. Webhook handlers use the backend pool (service_role). Unaffected. |

### Affected Queries (if RLS were enabled and backend switched to anon key):

This is a list of every SQL operation in the backend that would need updating:

| Table | File | Line | Operation |
|-------|------|------|-----------|
| `customer_lifecycle_events` | `lifecycle-event.repository.ts` | All | SELECT with `business_id` filter |
| `business_channels` | `business-channel.repository.ts` | All | All CRUD with `business_id` filter |
| `business_channels` | `whatsapp-webhook.handler.ts` | 117-138 | Direct SELECT with `channel_type` filter |
| `notifications` | `notification.repository.ts` | All | All CRUD with `business_id` filter |
| `message_deliveries` | `message-delivery.repository.ts` | All | All CRUD with `business_id` filter |
| `message_deliveries` | `operational.controller.ts` | Direct SQL | SELECTs with `business_id` filter |
| `message_deliveries` | `founder.controller.ts` | Direct SQL | Aggregate with `business_id` filter |
| `conversation_workflows` | `conversation-workflow.repository.ts` | All | No `business_id` available |
| `conversation_workflows` | `operational.controller.ts` | Direct SQL | Joins through `conversation_id` |

---

## Part 5 — Migration Plan (If RLS Were Required)

> **Decision:** RLS is **not required** because no frontend code directly accesses these tables. However, the following migrations would add defense-in-depth.

### Policy: `business_channels`

```sql
ALTER TABLE business_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_read_business_channels ON business_channels
  FOR SELECT TO authenticated
  USING (business_id = current_user_business_id());

CREATE POLICY owner_write_business_channels ON business_channels
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id = current_user_business_id()
    AND EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE user_id = auth.uid()
        AND business_id = current_user_business_id()
        AND role = 'owner'
    )
  );

CREATE POLICY owner_update_business_channels ON business_channels
  FOR UPDATE TO authenticated
  USING (business_id = current_user_business_id())
  WITH CHECK (
    business_id = current_user_business_id()
    AND EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE user_id = auth.uid()
        AND business_id = current_user_business_id()
        AND role = 'owner'
    )
  );

CREATE POLICY owner_delete_business_channels ON business_channels
  FOR DELETE TO authenticated
  USING (
    business_id = current_user_business_id()
    AND EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE user_id = auth.uid()
        AND business_id = current_user_business_id()
        AND role = 'owner'
    )
  );

-- Service role bypass (all operations)
CREATE POLICY service_role_all_business_channels ON business_channels
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

### Policy: `notifications`

```sql
-- First remove the explicit disable
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_read_notifications ON notifications
  FOR SELECT TO authenticated
  USING (business_id = current_user_business_id());

-- Notifications are created by backend processes, not by users directly
CREATE POLICY service_role_insert_notifications ON notifications
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY staff_update_notifications ON notifications
  FOR UPDATE TO authenticated
  USING (business_id = current_user_business_id())
  WITH CHECK (business_id = current_user_business_id());

CREATE POLICY service_role_all_notifications ON notifications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

### Policy: `message_deliveries`

```sql
ALTER TABLE message_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_read_message_deliveries ON message_deliveries
  FOR SELECT TO authenticated
  USING (business_id = current_user_business_id());

-- Backend services create/update delivery records
CREATE POLICY service_role_all_message_deliveries ON message_deliveries
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

### Policy: `conversation_workflows`

> **Requires schema change first:** Add `business_id` column.

```sql
ALTER TABLE conversation_workflows ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- Backfill from conversations table
UPDATE conversation_workflows cw
SET business_id = c.business_id
FROM conversations c
WHERE cw.conversation_id = c.id;

ALTER TABLE conversation_workflows ALTER COLUMN business_id SET NOT NULL;

CREATE INDEX ON conversation_workflows(business_id);

-- Now enable RLS
ALTER TABLE conversation_workflows ENABLE ROW LEVEL SECURITY;

-- Public chat can read workflows for their session
-- (This needs careful design — anon users need access to their own workflow)
CREATE POLICY anon_access_conversation_workflows ON conversation_workflows
  FOR SELECT TO anon
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE session_id = current_setting('app.session_id')::uuid
    )
  );

CREATE POLICY staff_read_conversation_workflows ON conversation_workflows
  FOR SELECT TO authenticated
  USING (
    business_id = current_user_business_id()
  );

CREATE POLICY service_role_all_conversation_workflows ON conversation_workflows
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

---

## Part 6 — Verdict

### FINAL VERDICT: **OPTIONAL HARDENING**

| Table | Risk | Verdict | Action |
|-------|------|---------|--------|
| `customer_lifecycle_events` | ✅ Already protected | **NO ACTION** | Already has RLS + SELECT policy |
| `business_channels` | 🟡 Low | **OPTIONAL** | Add RLS + SELECT policy for defense-in-depth |
| `notifications` | 🟡 Low | **OPTIONAL** | Remove `DISABLE ROW LEVEL SECURITY`, add RLS + SELECT policy |
| `message_deliveries` | 🟡 Low | **OPTIONAL** | Add RLS + SELECT policy |
| `conversation_workflows` | 🟡 Low + schema gap | **OPTIONAL** | Requires adding `business_id` column first (schema change) |
| `pgmigrations` | 🟢 None | **NO ACTION** | Infra table, no tenant data |

### Rationale

There are **zero direct Supabase client queries** from the frontend to any of these 6 tables. Every database operation flows through the backend Node.js service, which uses `service_role` connections via `pg.Pool`. Service role connections bypass RLS entirely.

The existing architecture provides tenant isolation through:
1. **Application-layer filtering** — Every backend query includes `WHERE business_id = $1`
2. **Authentication middleware** — All user-facing API routes require valid staff auth with business context
3. **Service-role database connection** — Backend connects with superuser privileges, not anon key

### What NO ACTION means

- The Security Advisor warnings are **informational**, not security defects
- Enabling RLS would not fix any actual vulnerability
- Enabling RLS would not break any existing functionality (backend uses service_role)
- The warnings should be suppressed or acknowledged as low-priority

### If OPTIONAL HARDENING is pursued

1. Prioritize `notifications` (explicit DISABLE RLS should be removed)
2. Then `business_channels` (contains channel config — lowest effort, highest value)
3. Then `message_deliveries` (operational telemetry)
4. Last: `conversation_workflows` (requires schema migration to add `business_id`)

### Regressions to Test After Enabling RLS

| Test | What to verify |
|------|---------------|
| Admin notifications load | `GET /api/notifications` returns staff's business notifications |
| Mark notification read | `PATCH /api/notifications/:id/read` updates correctly |
| Channel settings page | `GET /api/settings/channels` returns correct channels |
| WhatsApp message send | Delivery record created with correct status |
| Chat booking flow | Workflow state transitions complete correctly |
| Founder health dashboard | Cross-business aggregate queries still work |
| Twilio status callbacks | Delivery status updates processed correctly |
