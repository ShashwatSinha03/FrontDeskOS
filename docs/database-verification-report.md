# Database Verification Report

## Files Changed

| File | Change |
|---|---|
| `database/schema.sql:782` | Added `business_id` column and value to all seed message INSERT rows |
| `backend/src/repositories/conversation.repository.ts:54-55` | Added `business_id` column with subquery `(SELECT business_id FROM conversations WHERE id = $1)` |
| `backend/dist/repositories/conversation.repository.js` | Deleted — will be regenerated on next build |

## Exact Code Changes

### 1. `database/schema.sql` (line 782)

**Before:**
```sql
INSERT INTO messages (conversation_id, sender, content) VALUES
  ('e0a80121-0001-4000-8000-000000000001', 'customer', 'Hi, I''d like to schedule a teeth cleaning.'),
  ('e0a80121-0001-4000-8000-000000000001', 'agent', 'Hello John! I''d be happy to help you schedule a teeth cleaning. We have availability this week. What day works best for you?'),
  ('e0a80121-0001-4000-8000-000000000002', 'customer', 'Do you offer payment plans for dental work?'),
  ('e0a80121-0001-4000-8000-000000000002', 'agent', 'Yes, we do offer flexible payment plans. Let me connect you with our financing options.');
```

**After:**
```sql
INSERT INTO messages (conversation_id, business_id, sender, content) VALUES
  ('e0a80121-0001-4000-8000-000000000001', 'd4a6f7b1-e23a-48d6-95bc-79f94eb97210', 'customer', 'Hi, I''d like to schedule a teeth cleaning.'),
  ('e0a80121-0001-4000-8000-000000000001', 'd4a6f7b1-e23a-48d6-95bc-79f94eb97210', 'agent', 'Hello John! I''d be happy to help you schedule a teeth cleaning. We have availability this week. What day works best for you?'),
  ('e0a80121-0001-4000-8000-000000000002', 'd4a6f7b1-e23a-48d6-95bc-79f94eb97210', 'customer', 'Do you offer payment plans for dental work?'),
  ('e0a80121-0001-4000-8000-000000000002', 'd4a6f7b1-e23a-48d6-95bc-79f94eb97210', 'agent', 'Yes, we do offer flexible payment plans. Let me connect you with our financing options.');
```

The `business_id` value (`d4a6f7b1-e23a-48d6-95bc-79f94eb97210`) matches the Apex Dental Care business used by both conversations.

### 2. `backend/src/repositories/conversation.repository.ts` (line 54-55)

**Before:**
```typescript
    const query = `
      INSERT INTO messages (conversation_id, sender, content, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
```

**After:**
```typescript
    const query = `
      INSERT INTO messages (conversation_id, business_id, sender, content, metadata)
      VALUES ($1, (SELECT business_id FROM conversations WHERE id = $1), $2, $3, $4)
      RETURNING *
    `;
```

The subquery `(SELECT business_id FROM conversations WHERE id = $1)` derives the tenant from the parent conversation. No schema changes, no parameter changes, no caller changes needed.

## INSERT INTO Messages Inventory

| Location | Type | business_id Before | business_id After |
|---|---|---|---|
| `database/schema.sql:782` | Seed data | Missing | Fixed |
| `backend/src/repositories/conversation.repository.ts:54` | Runtime | Missing | Fixed (subquery) |
| `backend/dist/repositories/conversation.repository.js:51` | Compiled JS | Missing | Regenerated on build |
| `database/seed-brightsmile.sql` | Seed data | No messages seeded | N/A |
| Any other `.ts`/`.sql` file | — | Not found | N/A |

**Result: 0 remaining INSERT INTO messages statements omit `business_id`.**

## Tenant-Isolation Verification

The `addMessage` subquery `(SELECT business_id FROM conversations WHERE id = $1)` ensures every message inherits the `business_id` from its parent conversation. Since conversations are already correctly scoped to a business at creation time (`conversation.repository.ts:22-30`), this chain guarantees tenant isolation without caller awareness.

Five call sites exist — all pass `conversationId` as the first argument. None need changes:

| Caller | File |
|---|---|
| `public.controller.ts:118` | Customer web chat message |
| `chat.service.ts:102` | User message in agent chat |
| `chat.service.ts:156` | Agent reply in chat |
| `webchat.channel.ts:25` | Recovery engine webchat message |
| `followup.service.ts:98` | Follow-up message send |

## Remaining NOT NULL Risks (Schema Execution)

All `INSERT INTO` statements in `database/schema.sql` were audited against their table definitions. The only violation was the `messages.business_id` omission, now fixed.

**Verified clean (no NOT NULL violations):**
- `businesses` (line 705) — all required columns provided
- `services` (line 747) — all required columns provided
- `staff_profiles` (line 754) — all required columns provided
- `availability_schedules` (line 758) — all required columns provided
- `customers` (line 769) — all required columns provided
- `conversations` (line 777) — all required columns provided
- `messages` (line 782) — **FIXED**
- `appointments` (line 789) — all required columns provided

**Tables with no seed data (no risk):**
`customer_sessions`, `customer_channels`, `escalations`, `knowledge_requests`, `follow_ups`, `voice_calls`, `availability_overrides`, `calendar_credentials`

**Trigger inserts (`customer_lifecycle_events`):**
Both trigger functions (`log_customer_lifecycle_creation` at line 406, `log_customer_lifecycle_transition` at line 450) correctly provide all required columns including `business_id`, `customer_id`, and `new_state`.

## TypeScript Compilation

`npx tsc --noEmit` in `backend/` — **zero errors**.

## Other NOT NULL Violations Likely During Schema Execution

**None identified.** All schema definitions use sensible defaults (`DEFAULT gen_random_uuid()`, `DEFAULT NOW()`, `DEFAULT 'pending'`, etc.) for optional columns, and all required columns are explicitly provided in every INSERT statement.

---

## Database Verification Checklist

Run these queries after schema execution to confirm all seed data is present:

```sql
-- 1. Businesses
SELECT COUNT(*) AS businesses FROM businesses;

-- 2. Services
SELECT COUNT(*) AS services FROM services;

-- 3. Customers
SELECT COUNT(*) AS customers FROM customers;

-- 4. Conversations
SELECT COUNT(*) AS conversations FROM conversations;

-- 5. Messages (should be 4)
SELECT COUNT(*) AS messages FROM messages;

-- 6. Appointments
SELECT COUNT(*) AS appointments FROM appointments;

-- 7. Follow-ups
SELECT COUNT(*) AS follow_ups FROM follow_ups;

-- 8. Knowledge Requests
SELECT COUNT(*) AS knowledge_requests FROM knowledge_requests;
```

### Expected Row Counts (Apex Dental seed only)

| Table | Expected | Notes |
|---|---|---|
| businesses | 1 | Apex Dental Care |
| services | 3 | Routine Cleaning, Filling, Invisalign Consult |
| customers | 5 | John Smith, Emily Johnson, Michael Brown, Sophia Davis, James Wilson |
| conversations | 2 | John Smith and Michael Brown |
| messages | 4 | 2 per conversation (customer + agent) |
| appointments | 1 | Sophia Davis confirmed booking |
| follow_ups | 0 | No seed data |
| knowledge_requests | 0 | No seed data |

After also running `database/seed-brightsmile.sql`, add 1 to businesses, 5 to services, 5 to customers.
