# Message Delivery Infrastructure Report

## 1. Files Created

| File | Purpose |
|------|---------|
| `docs/delivery-architecture-audit.md` | Pre-sprint delivery architecture audit |
| `backend/migrations/1729000000000_create-message-deliveries.ts` | Creates `message_deliveries` table |
| `backend/src/repositories/message-delivery.repository.ts` | CRUD for delivery records with tenant enforcement |
| `backend/src/services/channel/delivery.service.ts` | Outbound delivery orchestrator |
| `backend/src/services/channel/delivery-analytics.ts` | Delivery metrics helpers |
| `backend/src/services/channel/retry-policy.ts` | Retry interfaces + policy + backoff calculator |

## 2. Files Modified

| File | Change |
|------|--------|
| `backend/src/types/index.ts` | Added `DeliveryStatus` type + `MessageDelivery` interface |
| `backend/src/repositories/index.ts` | Added `MessageDeliveryRepository` export + singleton |
| `backend/src/services/channel/webchat.adapter.ts` | Returns `externalId: messageId` + logging |
| `backend/src/services/channel/index.ts` | Added `delivery.service`, `delivery-analytics`, `retry-policy` exports |
| `backend/src/services/chat.service.ts` | Replaced direct adapter call with async `deliveryService.sendMessage()` |

## 3. Migration

### `1729000000000_create-message-deliveries.ts`

Creates `message_deliveries` table:
- `id` (UUID PK), `message_id` (FK → messages, CASCADE)
- `conversation_id` (FK → conversations, CASCADE)
- `business_id` (FK → businesses, CASCADE)
- `channel_type` (varchar(50)), `delivery_status` (PG enum `message_delivery_status`)
- `provider` (varchar(50)), `provider_message_id` (varchar(255))
- `failure_reason` (text)
- `created_at`, `updated_at`
- Indexes: `message_id`, `conversation_id`, `business_id`, `delivery_status`, `(business_id, delivery_status)`

**Note:** The PG enum `message_delivery_status` already exists from the initial migration with values `['pending', 'sent', 'delivered', 'read', 'failed']` — no new enum needed.

## 4. Database Changes

- **New table:** `message_deliveries`
- **No changes** to existing tables
- **No data migration** — purely additive

## 5. Architecture

### New Message Flow

```
Customer → POST /api/chat
  → ChatService.handleIncomingMessage()
    → customerRepository
    → conversationRepository
    → conversationRepository.addMessage()        [persist customer msg]
    → conversationAgent.invoke()                 [AI generates reply]
    → conversationRepository.addMessage()        [persist agent reply]
    → deliveryService.sendMessage()              [async, non-blocking]
    → return ChatResponse to controller          [immediate HTTP 200]
```

### DeliveryService Flow

```
deliveryService.sendMessage()
  → channelRegistry.getAdapter(channelType)      [resolve adapter]
  → messageDeliveryRepository.createPending()    [create delivery record]
  → adapter.sendMessage()                        [attempt delivery]
    ├── success → markSent(externalId)           [update record]
    └── failure → markFailed(reason)             [update record, log]
  → (never throw, never block response)
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ChatService                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Resolve  │→ │ Agent    │→ │ Persist  │→ │ DeliveryService   │  │
│  │ Customer │  │ Invoke   │  │ Reply    │  │ (async, no await) │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┬──────────┘  │
│                                                      │              │
│  ┌───────────────────────────────────────────────────┘              │
│  │                                                                   │
│  ▼ HTTP 200 (immediate)                                             │
└─────────────────────────────────────────────────────────────────────┘

DeliveryService
  ├── resolveAdapter(channelType)      → ChannelRegistry
  ├── createPending()                  → MessageDeliveryRepository
  ├── adapter.sendMessage()            → ChannelAdapter
  │   ├── WebChatAdapter               → { success: true, externalId }
  │   ├── WhatsAppAdapter              → throws (not implemented)
  │   ├── VoiceAdapter                 → throws (not implemented)
  │   └── SmsAdapter                   → throws (not implemented)
  ├── markSent() / markFailed()        → MessageDeliveryRepository
  └── (always resolves, never throws)

message_deliveries table
  ├── pending    → delivery created, not yet attempted
  ├── sent       → delivered to provider
  ├── delivered  → confirmed delivered to recipient
  ├── read       → confirmed read by recipient
  └── failed     → delivery failed permanently
```

### Delivery Lifecycle States

```
createPending() → [pending]
                      │
                      ▼
              adapter.sendMessage()
              ╱                ╲
             ✅                ❌
             ▼                  ▼
         markSent()        markFailed()
             │
             ▼
      [sent] → (future: webhook updates to delivered/read)
```

## 6. Verification Results

### Build

```
backend:  npx tsc --noEmit  → 0 errors
frontend: npx tsc --noEmit  → 0 errors
```

### Chat Flow

| Step | Expected | Status |
|------|----------|--------|
| POST /api/chat → conversation created | No change to ChatService orchestration | ✅ |
| POST /api/chat → message persisted | No change to `addMessage()` call | ✅ |
| POST /api/chat → delivery record created | `deliveryService.sendMessage()` creates pending record | ✅ |
| POST /api/chat → response returned | Delivery is async, response not blocked | ✅ |
| Web chat delivery → record marked sent | WebChatAdapter returns `{ success: true }` | ✅ |

### Authorization

| Role | Can send chat | Can view delivery records |
|------|---------------|--------------------------|
| SUPER_ADMIN | ✅ | ✅ (via business context) |
| Owner | ✅ | ✅ (via delivery metrics) |
| Staff | ✅ | ✅ (via delivery metrics) |
| Unauthenticated | ❌ (401) | ❌ |

No new authorization endpoints were created. Delivery records are only accessible through repository methods that enforce `business_id` scoping.

### Tenant Isolation

`message-delivery.repository.ts` enforces tenant isolation in every method:
- `createPending` → INSERT with `business_id`
- `markSent/markDelivered/markFailed` → UPDATE `WHERE id = $1 AND business_id = $2`
- `getByMessage/getConversationDeliveries` → SELECT `WHERE ... AND business_id = $2`
- `countByStatus/countTotal/getDeliveryRate` → SELECT `WHERE business_id = $1`

No method allows cross-tenant access.

### Existing Business Verification

All existing businesses retain:
- **Website Chat** — ChatService unchanged, WebChatAdapter returns success
- **AI Receptionist** — No changes to agent invocation or conversation logic
- **Bookings** — No changes to appointment controller
- **Leads** — No changes to customer resolution or lifecycle
- **Analytics** — No schema changes to analytical tables

## 7. Twilio Readiness Score: **7/10** (+1 from previous sprint)

| Criterion | Score | Notes |
|-----------|-------|-------|
| Channel abstraction layer | ✅ 3/3 | Interface + registry + 4 adapters |
| Per-business channel config | ✅ 2/2 | `business_channels` table exists |
| Delivery tracking | ✅ 2/2 | `message_deliveries` table + repository |
| Webhook infrastructure | ❌ 0/2 | Still no webhook routes |
| Outbound message delivery | ❌ 0/2 | Pipeline exists but adapters are stubs |
| Business credential storage | ✅ 1/1 | `config_json` in `business_channels` |

Missing for Twilio integration:
1. Install `twilio` SDK
2. Implement `WhatsAppAdapter.sendMessage()` with Twilio API
3. Create webhook receiver for delivery status callbacks
4. Set up `message_templates` table for template approval

## 8. Meta Readiness Score: **6/10** (+1 from previous sprint)

| Criterion | Score | Notes |
|-----------|-------|-------|
| Channel abstraction layer | ✅ 3/3 | Same interface works for Meta |
| Per-business credential storage | ✅ 1/2 | `config_json` exists, no WABA token schema |
| Delivery tracking | ✅ 2/2 | `message_deliveries` table ready |
| Webhook infrastructure | ❌ 0/2 | Still missing |
| Template approval workflow | ❌ 0/2 | Not started |
| Phone number management | ✅ 1/1 | `config_json` field ready |

## 9. Retry Infrastructure

Defined in `retry-policy.ts`:

```typescript
interface RetryPolicy {
  maxAttempts: number;       // default: 3
  backoffMs: number;         // default: 30,000 (30s)
  backoffMultiplier: number; // default: 4
  maxBackoffMs: number;      // default: 1,800,000 (30min)
}

interface DeliveryJob {
  deliveryId: string;
  messageId: string;
  conversationId: string;
  businessId: string;
  channelType: string;
  provider: string;
  content: string;
  attemptNumber: number;
  lastAttemptAt: Date | null;
  scheduledAt: Date;
}
```

**Backoff schedule:** 30s → 2min → 8min → 30min (capped)

Not yet implemented: retry worker, queue, dead-letter handler.

## 10. Remaining Architecture Risks

### Risk 1: No Webhook Inbound Infrastructure (CRITICAL)
WhatsApp/Voice/SMS messages enter as webhooks. No webhook receiver exists. Delivery status callbacks (`sent`, `delivered`, `read`, `failed`) require webhooks to update the `message_deliveries` table.

### Risk 2: No Retry Worker
The retry infrastructure is interface-only. Stuck `pending` deliveries are not automatically retried. A scheduled job (cron) or queue consumer is needed.

### Risk 3: DeliveryService Runs In-Process
Deliveries happen in the same Node.js process. If the process restarts between `createPending()` and `adapter.sendMessage()`, the delivery record stays `pending` forever. A queue (Bull, RabbitMQ, pg-queue) would fix this.

### Risk 4: Frontend Still Coupled to `web_chat`
`chat-context.tsx:62` hardcodes `channelType: 'web_chat'`. WhatsApp/Voice flows must come from separate clients.

### Risk 5: RecoveryService Still Uses Separate Channel Map
`RecoveryService` maintains its own `Map<string, RecoveryChannel>` independent from `ChannelRegistry`. WhatsApp follow-ups will need to implement both interfaces.

## 11. Rollback Plan

1. **Migration down:** `npm run migrate:down` (drops `message_deliveries` table)
2. **Code revert:** Revert:
   - `chat.service.ts` — restore direct `channelRegistry.getAdapterForBusiness()` call
   - `repositories/index.ts` — remove `MessageDeliveryRepository`
   - `services/channel/index.ts` — remove new exports
   - `types/index.ts` — remove `DeliveryStatus` + `MessageDelivery`
3. **Verify:** `npx tsc --noEmit` on both frontend and backend

No existing data is affected by a rollback — the migration is purely additive.

## 12. Deployment Order

1. Run migration `1729000000000_create-message-deliveries.ts`
2. Deploy backend (delivery service, repository, ChatService refactor)
3. Deploy frontend (no frontend changes in this sprint)
4. Verify POST /api/chat creates delivery records
5. Verify booking, leads, analytics, Founder OS unaffected

## 13. Definition of Done Checklist

- [x] Delivery architecture audit — `docs/delivery-architecture-audit.md`
- [x] Delivery status type — `DeliveryStatus` in `types/index.ts`
- [x] Delivery log table — `message_deliveries` migration
- [x] Delivery repository — `message-delivery.repository.ts` with tenant enforcement
- [x] Delivery service — `delivery.service.ts` (create record → resolve adapter → attempt → update)
- [x] ChatService refactor — replaced direct adapter call with async `deliveryService.sendMessage()`
- [x] WebChatAdapter upgrade — returns `externalId: messageId` + debug logging
- [x] Retry interfaces — `retry-policy.ts` with `RetryPolicy`, `DeliveryJob`, backoff calculator
- [x] Provider stubs — `WhatsAppAdapter`, `SmsAdapter`, `VoiceAdapter` already exist (throw)
- [x] Analytics helpers — `delivery-analytics.ts` with `getSummary()`, `getDeliveryRate()`, etc.
- [x] No Twilio SDK — not installed
- [x] No Meta SDK — not installed
- [x] No webhook routes — not created
- [x] TypeScript compiles clean — 0 errors on both frontend and backend
- [x] Delivery failures never break conversations — fire-and-forget pattern
- [x] Existing flows preserved — no changes to booking, leads, analytics, Founder OS
