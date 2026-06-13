# Channel Foundation Audit

## 1. Existing Channel Infrastructure

### 1a. Enums & Types

| Type | Location | Values | Notes |
|------|----------|--------|-------|
| `ChannelType` | `types/index.ts:18` | `web_chat`, `whatsapp`, `voice` | Core channel type |
| `FollowUpChannel` | `types/index.ts:31` | `web_chat`, `whatsapp`, `voice`, `sms` | Recovery-only; `sms` not in ChannelType |
| PG `channel_type` | `migrations/initial-schema.ts:11` | `web_chat`, `whatsapp`, `voice` | PG enum, 3 values |

### 1b. Database Tables

| Table | Key Columns | Channel Relevance |
|-------|-------------|-------------------|
| `customer_channels` | `customer_id`, `channel_type` (enum), `channel_identity` | Links customer identities per channel |
| `conversations` | `channel_type` (enum), `status` | Tracks which channel a conversation belongs to |
| `follow_ups` | `channel` (varchar(50) — not enum) | Recovery delivery channel |

### 1c. Channel Adapters (Message Delivery)

| Class | Location | Status |
|-------|----------|--------|
| `ChannelAdapter` interface | `services/channel/channel-adapter.interface.ts` | Stable |
| `WebChatAdapter` | `services/channel/webchat.adapter.ts` | Functional (no-op) |
| `WhatsAppAdapter` | `services/channel/whatsapp.adapter.ts` | Stub (throws) |
| `VoiceAdapter` | `services/channel/voice.adapter.ts` | Stub (throws) |
| `SmsAdapter` | `services/channel/sms.adapter.ts` | Stub (throws) |

**`ChannelRegistry` only registers `WebChatAdapter`** (`channel-registry.ts:10`). Others exist but are unregistered.

### 1d. Recovery Channels (Follow-up Delivery)

| Class | Location | Status |
|-------|----------|--------|
| `RecoveryChannel` interface | `services/recovery/channel.interface.ts` | Stable |
| `WebChatChannel` | `services/recovery/webchat.channel.ts` | Functional |
| `WhatsAppChannel` | `services/recovery/whatsapp.channel.ts` | Stub (throws) |
| `VoiceChannel` | `services/recovery/voice.channel.ts` | Stub (throws) |
| `SmsChannel` | `services/recovery/sms.channel.ts` | Stub (throws) |

**All 4 are registered** in `RecoveryService` constructor (`recovery.service.ts:21-24`).

### 1e. Services Using Channels

| Service | How It Uses Channels |
|---------|---------------------|
| `ChatService` | Accepts `channelType` in input. Routes delivery through `channelRegistry.getAdapterForBusiness()`. |
| `RecoveryService` | Uses `Map<string, RecoveryChannel>` for follow-up delivery. |
| `FollowUpService` (legacy) | Hardcodes `'web_chat'`. Does NOT use adapters. Likely dead code. |
| `PublicController.submitContact` | Hardcodes `'web_chat'` for identity lookup, channel link, conversation creation. |
| `AppointmentController` | Hardcodes `'web_chat'` for conversation creation during booking. |

### 1f. Frontend

| File | Channel Usage |
|------|---------------|
| `chat-context.tsx:62` | **Hardcodes** `channelType: 'web_chat'` |
| `api.ts:55` | Accepts `ChannelType` in type but only `web_chat` is ever passed |
| Settings page | No channel configuration exists |

## 2. Reusable Components

- **`RecoveryChannel` pattern**: Clean single-method interface. Registry pattern using `Map<string, T>`.
- **`ChannelAdapter` interface**: Four-method contract. Registry with `getAdapterForBusiness()` already stubbed.
- **`customer_channels` table**: Well-designed — generic `channel_identity` works for session IDs, phone numbers, JIDs.
- **`conversations.channel_type`**: Already stored on every conversation — no migration needed for existing data.

## 3. Architecture Risks

### RISK-1: No Per-Business Channel Configuration (BLOCKER)

Currently there is no `business_channels` table or equivalent. A business cannot:
- Enable/disable channels independently
- Store provider preferences (Twilio vs Meta)
- Store channel-specific configuration (phone numbers, credentials)

**Impact**: Cannot determine if a business wants WhatsApp until external provider integration. Every business implicitly has `web_chat` only.

### RISK-2: ChannelRegistry Only Registers WebChat

`WhatsAppAdapter`/`VoiceAdapter`/`SmsAdapter` are never registered. Incoming `whatsapp` or `voice` messages will:
1. Be processed by the AI agent (waste of compute)
2. Persist the reply to the transcript
3. Fail silently at delivery (`sendMessage` throws, error is logged, reply never delivered)

### RISK-3: Multiple Hardcoded `'web_chat'` Strings

| Location | Line | Context |
|----------|------|---------|
| `chat-context.tsx` | 62 | Frontend always sends `web_chat` |
| `public.controller.ts` | 104, 112, 116 | Contact form |
| `appointment.controller.ts` | 90 | Booking flow |
| `recovery.service.ts` | 104 | Recovery conversation creation |
| `followup.service.ts` | 71 | Legacy follow-up |

### RISK-4: No Inbound Webhook Infrastructure

All messages enter through `POST /api/chat`. WhatsApp/Voice/SMS messages arrive as webhooks. No webhook receivers exist.

### RISK-5: Two Channel Interface Hierarchies

`ChannelAdapter` (message delivery) and `RecoveryChannel` (follow-up) are independent. They should share a common core to prevent duplicate implementation work when adding new providers.

### RISK-6: Legacy `FollowUpService` Bypasses All Abstraction

`followup.service.ts` does not use `ChannelAdapter`, `RecoveryChannel`, or `channelRegistry`. It hardcodes `web_chat` and manually chains follow-ups. If still active, it creates a silent dual code path.

## 4. Migration Risks

### RISK-M1: PG Enum Expansion

Adding `'sms'` to the `channel_type` PG enum requires `ALTER TYPE channel_type ADD VALUE 'sms'`. Safe but requires a migration. Adding to `FollowUpChannel` (TS type) has zero DB cost since `follow_ups.channel` is `varchar`.

### RISK-M2: Existing Data

- `conversations` with `channel_type = 'web_chat'` — unaffected
- `customer_channels` with `web_chat` identities — unaffected
- `follow_ups` with `channel = 'web_chat'` — unaffected

No data migration needed. Adding a `business_channels` table is additive.

## 5. Coupling Risks

### COUPLE-1: Frontend Permanently Coupled to `web_chat`

The chat widget can only send `web_chat` messages. WhatsApp/Voice flows must enter through separate clients (webhooks, mobile apps) calling the same `POST /api/chat`.

### COUPLE-2: Zod Schemas Duplicate ChannelType

Chat controller (`chat.controller.ts:8`), recovery controller (`recovery.controller.ts:35`), and frontend API (`api.ts:55`) each independently list channel type literals. Adding a channel requires updating 3+ files.

### COUPLE-3: Recovery Default Sequence Is All-WebChat

`recovery.service.ts:145-151` defaults to three `web_chat` recovery steps. Businesses with `whatsapp`-only customers need explicit `recoveryConfig` to avoid useless `web_chat` follow-ups.

## Summary

| Layer | Readiness | Notes |
|-------|-----------|-------|
| Schema | Core types exist | `channel_type` enum, `customer_channels`, `conversations.channel_type` |
| Delivery abstraction | Stubbed | `ChannelAdapter` + `ChannelRegistry` exist, only web_chat works |
| Recovery abstraction | Stubbed | `RecoveryChannel` + registration exist, only web_chat works |
| Per-business config | **MISSING** | No `business_channels` table — this sprint builds it |
| Inbound infrastructure | **MISSING** | No webhook receivers |
| Frontend channel config | **MISSING** | No settings UI — this sprint builds it |
| Frontend chat client | `web_chat` only | Hardcoded — out of scope for this sprint |
