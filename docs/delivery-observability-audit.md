# Delivery Observability Audit

**Date:** 2026-06-14  
**Audit Scope:** Full delivery lifecycle for all channel types  
**Author:** Validation Sprint

---

## 1. Delivery Lifecycle Map

```
Message (messages table)
  │
  ▼
Delivery Record Created (message_deliveries)
  │  status: pending
  │  provider: internal | twilio
  │
  ▼
Adapter.sendMessage()
  │  success → markSent()  (status: sent)
  │  failure → markFailed()
  │
  ▼
Status Callback (Twilio only)
  │  queued → pending (no-op, already pending)
  │  sent → sent (if still pending)
  │  delivered → delivered
  │  failed → failed
  │  undelivered → failed
  │  read → (not mapped, currently ignored)
  │  accepted → (not mapped, currently ignored)
  │
  ▼
Final State: delivered | sent | failed | pending
```

---

## 2. Visibility Gaps

### Gap 1: No delivery health endpoint for non-owners
- `GET /settings/channels` now includes `deliveryHealth` in the response
- But staff/non-owner users see "Active"/"Inactive" without delivery metrics
- **Risk:** Low — owners are the primary audience for delivery health

### Gap 2: No per-conversation delivery status in conversation UI
- Conversations don't display delivery status per message
- Operator dashboard doesn't show whether a reply was delivered
- **Risk:** Medium — operators can't tell if a customer received the reply

### Gap 3: Status callback mapping is incomplete
- Twilio `read` status is not mapped → silently discarded
- Twilio `accepted` status is not mapped → silently discarded
- `read` is a terminal status showing the recipient opened the message
- **Risk:** Low — `read` receipts are informational, not required for delivery confirmation

### Gap 4: No delivery timeout detection
- Deliveries stuck in `pending` are not detected or alerted
- No mechanism to re-try stuck deliveries
- **Risk:** Medium — a stuck delivery is invisible until someone checks the DB

### Gap 5: No delivery latency tracking
- No metric for time-to-delivery (created_at → delivered_at)
- Can't detect slow delivery providers
- **Risk:** Low — not needed for pilot

### Gap 6: Provider field attribution
- **FIXED:** `resolveProvider()` now returns `twilio` for WhatsApp channels with configured numbers
- Web chat correctly returns `internal`
- Future `meta` provider will be detected from DB `provider` column

---

## 3. Twilio Status Mapping Audit

### Current Mapping (`whatsapp-webhook.handler.ts:141-150`)

| Twilio Status | Mapped Status | Action | Notes |
|--------------|---------------|--------|-------|
| `queued` | `pending` | No-op (already pending) | Correct |
| `sent` | `sent` | Update if currently `pending` | Correct |
| `delivered` | `delivered` | Final delivered state | Correct |
| `failed` | `failed` | Final failed state | Correct |
| `undelivered` | `failed` | Treated as failure | Correct |
| `read` | ❌ **Not mapped** | Silently discarded | Should be added |
| `accepted` | ❌ **Not mapped** | Silently discarded | Should be added |

### Missing Mappings

**`read`** — The recipient has read the message. This is a terminal positive status.
- Should map to: `delivered` (since we don't have a `read` delivery status)
- Or: Add `read` to the `DeliveryStatus` enum
- **Recommendation:** Map `read` → `delivered` for now. The `DeliveryStatus` type has `read` in the PG enum but it's never set by code.

**`accepted`** — Twilio has accepted the message for delivery.
- Should map to: `pending` (no-op, already pending)
- **Recommendation:** Add mapping `accepted` → `pending`

### Fixed Mapping

```typescript
private mapTwilioStatus(status: string): string | null {
    const map: Record<string, string> = {
      queued: 'pending',
      accepted: 'pending',
      sent: 'sent',
      delivered: 'delivered',
      read: 'delivered',
      failed: 'failed',
      undelivered: 'failed',
    };
    return map[status] || null;
  }
```

---

## 4. Delivery Status State Machine

```
                  ┌─────────┐
                  │ pending │
                  └────┬────┘
                       │
              ┌────────┼────────┐
              │        │        │
              ▼        ▼        ▼
           ┌──────┐ ┌─────┐ ┌──────┐
           │ sent │ │failed│ │delivered│
           └──────┘ └─────┘ └──────┘
              │
              ▼
         ┌──────────┐
         │ delivered │ (via callback)
         └──────────┘
```

- `pending` → `sent` → `delivered` (happy path)
- `pending` → `delivered` (when callback skips `sent`)
- `pending` → `failed` (delivery failure)
- `sent` → `delivered` (normal callback progression)

---

## 5. Telemetry Available

### Current Log Lines

| Event | Log Level | File | Line |
|-------|-----------|------|------|
| Delivery created | Implicit (no log on create) | `delivery.service.ts` | 23-29 |
| Delivery succeeded | `info` | `delivery.service.ts` | 46-53 |
| Delivery returned unsuccessful | `warn` | `delivery.service.ts` | 60-67 |
| Delivery failed with error | `error` | `delivery.service.ts` | 71-77 |
| Failed to mark delivery as failed | `error` | `delivery.service.ts` | 82-87 |
| WhatsApp inbound processed | `info` | `whatsapp-webhook.handler.ts` | 50-53 |
| WhatsApp status callback processed | `info` | `whatsapp-webhook.handler.ts` | 102-107 |
| Invalid Twilio signature | `warn` | `webhook.controller.ts` | 20-23 |
| WhatsApp webhook handler error | `error` | `webhook.controller.ts` | 33-36 |

### Missing Telemetry

| Gap | Impact | Priority |
|-----|--------|----------|
| No delivery creation log | Can't correlate message → delivery timing | Low |
| No delivery latency metric | Can't detect slow delivery | Low |
| No per-business delivery dashboard | Owners can't see delivery health without Settings page | Medium |
| No delivery health for web_chat | Currently only WhatsApp matters, but web_chat has no delivery concept | Low |

---

## 6. Monitoring Recommendations

### Pre-Pilot (implemented in this sprint)

1. ✅ `deliveryService.getDeliveryHealth()` — aggregate health metrics per business
2. ✅ `messageDeliveryRepository.getFailedDeliveries()` — retrieve recent failures
3. ✅ `messageDeliveryRepository.getDeliveryHealth()` — per-channel breakdown
4. ✅ Frontend shows delivery health in WhatsApp channel card
5. ✅ Provider attribution fixed (`twilio` instead of `internal`)

### Post-Pilot Recommendations

1. Add `read` and `accepted` to Twilio status mapping (5 min change)
2. Add delivery creation log line (5 min change)
3. Add delivery timeout detection (stuck `pending` > 5 min → log warning)
4. Add per-conversation delivery status in operator dashboard
5. Add delivery latency tracking (created_at → delivered_at duration)

---

## 7. Database Schema Audit

### `message_deliveries` Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `message_id` | UUID | FK → messages |
| `conversation_id` | UUID | FK → conversations |
| `business_id` | UUID | FK → businesses |
| `channel_type` | VARCHAR(50) | Indexed |
| `delivery_status` | ENUM | pending/sent/delivered/read/failed |
| `provider` | VARCHAR(50) | twilio/internal/meta |
| `provider_message_id` | VARCHAR(255) | Twilio SID or future provider ID |
| `failure_reason` | TEXT | Populated on failure |
| `created_at` | TIMESTAMPTZ | Delivery record creation |
| `updated_at` | TIMESTAMPTZ | Status update timestamp |

### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `message_deliveries_message_id_index` | `message_id` | Lookup by message |
| `message_deliveries_conversation_id_index` | `conversation_id` | Per-conversation view |
| `message_deliveries_business_id_index` | `business_id` | Tenant-scoped queries |
| `message_deliveries_delivery_status_index` | `delivery_status` | Status-based queries |
| `message_deliveries_business_id_delivery_status_index` | `business_id, delivery_status` | Per-business status filter |

### Schema Verdict

✅ Schema is adequate for pilot. No changes needed.
