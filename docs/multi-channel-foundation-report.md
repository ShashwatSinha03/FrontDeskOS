# Multi-Channel Foundation Report

## 1. Files Created

| File | Purpose |
|------|---------|
| `backend/migrations/1728000000000_create-business-channels.ts` | Creates `business_channels` table, seeds existing businesses |
| `backend/src/types/index.ts` | Added `BusinessChannel` interface |
| `backend/src/repositories/business-channel.repository.ts` | CRUD for business_channels with tenant enforcement |
| `backend/src/services/channel/channel.service.ts` | Channel validation, enablement, provider validation, capability checks |
| `backend/src/services/channel/channel-capabilities.ts` | Channel capability registry (web_chat, whatsapp, voice, sms) |
| `docs/channel-foundation-audit.md` | Pre-sprint architecture audit |

## 2. Files Modified

| File | Change |
|------|--------|
| `backend/src/repositories/index.ts` | Added `BusinessChannelRepository` export + singleton |
| `backend/src/controllers/settings.controller.ts` | Added `getChannels` + `updateChannel` endpoints |
| `backend/src/routes/settings.routes.ts` | Added `GET /settings/channels` + `PATCH /settings/channels/:channelType` |
| `backend/src/services/channel/channel-registry.ts` | Now registers ALL 4 adapters (web_chat, whatsapp, voice, sms) |
| `backend/src/services/channel/index.ts` | Added `channel.service` + `channel-capabilities` exports |
| `frontend/.../settings/page.tsx` | Added `'channels'` TabId, tab entry, ChannelsTab component |

## 3. Migration

### `1728000000000_create-business-channels.ts`

Creates `business_channels` table:
- `id` (UUID PK), `business_id` (FK → businesses, CASCADE)
- `channel_type` (varchar(50)), `enabled` (boolean, default true)
- `provider` (varchar(50), default 'internal')
- `config_json` (jsonb, default '{}')
- `created_at`, `updated_at`
- UNIQUE `(business_id, channel_type)`
- Indexes on `business_id` and `channel_type`

**Seeds existing businesses:**
- `web_chat`: enabled=true, provider=internal (all businesses)
- `whatsapp`: enabled=false, provider=internal (all businesses, ready for future)

Both INSERTs use `WHERE NOT EXISTS` to be idempotent.

## 4. Routes Changed

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/settings/channels` | Any member | Returns channels + capabilities |
| PATCH | `/settings/channels/:channelType` | Owner only | Update enabled/provider/configJson |

Both routes use the existing middleware chain: `authenticate → loadMembership → requireBusinessAccess` (GET) / `requireOwner` (PATCH).

## 5. Database Changes

- **New table:** `business_channels`
- **No changes** to existing tables (`businesses`, `conversations`, `customer_channels`)
- **No new columns** on `businesses` — WhatsApp credentials live in `config_json` only
- **No data migration** in existing tables — purely additive

## 6. Verification Results

### Build

```
backend:  npx tsc --noEmit  → 0 errors
frontend: npx tsc --noEmit  → 0 errors
```

### Endpoint Verification (Theoretical — requires running server)

| Endpoint | Expected | Notes |
|----------|----------|-------|
| `GET /settings/channels` | `{ channels: [...], capabilities: [...] }` | Returns all channels for the business |
| `PATCH /settings/channels/web_chat` | `{ ... enabled: false }` | Blocked if it's the only active channel |
| `PATCH /settings/channels/whatsapp` | `{ ... enabled: true }` | Allowed if web_chat is still active |

### Existing Endpoints (No regressions)

| Endpoint | Impact | Reason |
|----------|--------|--------|
| `POST /api/chat` | None | ChatService unchanged — `channelRegistry` still returns `WebChatAdapter` for `web_chat` |
| `GET /api/appointments/slots` | None | No channel dependencies |
| `POST /api/appointments/book` | None | Booking flow unchanged |
| Lead capture endpoints | None | `customer_channels` table unchanged |
| Analytics endpoints | None | No schema changes to analytical tables |
| Founder OS endpoints | None | No changes to ops routes |

### Authorization

| Role | `GET /settings/channels` | `PATCH /settings/channels/:type` |
|------|-------------------------|----------------------------------|
| SUPER_ADMIN | ✅ (via slug) | ✅ (via slug) |
| Owner | ✅ | ✅ |
| Staff | ✅ (read-only) | ❌ (403) |
| Unauthenticated | ❌ (401) | ❌ (401) |

The read route uses `requireBusinessAccess()` (any active member), while the write route uses `requireOwner()`.

### Tenant Isolation

`business_channel.repository.ts` enforces tenant isolation by scoping all queries with `business_id = $1`:
- `getChannels(businessId)` — scoped
- `getChannel(businessId, channelType)` — scoped
- `enableChannel/disableChannel/updateChannelConfig` — scoped with RETURNING clause
- `deleteChannel` — scoped

No raw SQL bypasses exist. All methods take `businessId` as a required parameter.

### Edge Cases

| Case | Expected | Status |
|------|----------|--------|
| 1. Website only | Works — web_chat seeded for all businesses | ✅ Code |
| 2. WhatsApp only | Configuration allowed, no errors | ✅ Code |
| 3. Website + WhatsApp | Configuration allowed | ✅ Code |
| 4. Disable final active channel | Blocked with error message | ✅ Service layer |
| 5. Business deletion | Channel configs cascade delete | ✅ FK constraint |
| 6. Disabled channel | Registry `hasAdapter` still returns true, but `channelService.canSendMessages` returns false | ✅ Code |
| 7. Existing businesses | Automatically seeded with web_chat enabled | ✅ Migration |
| 8. Booking Flow | No channel code changed — `'web_chat'` still hardcoded | ✅ No regression |
| 9. AI Receptionist | No channel code changed | ✅ No regression |
| 10. Lead Capture | No channel code changed | ✅ No regression |

## 7. Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Frontend (Settings)                 │
│  /[slug]/admin/settings → 'channels' tab            │
│  ├─ GET  /settings/channels     (read-only)         │
│  └─ PATCH /settings/channels/:type (owner only)     │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│              ChannelService                          │
│  ├─ getChannels / getChannel                        │
│  ├─ enableChannel / disableChannel                  │
│  ├─ updateChannel (enabled + provider + config)     │
│  ├─ isChannelEnabled / assertChannelEnabled          │
│  ├─ canReceiveMessages / canSendMessages             │
│  └─ getAdapterForChannel                            │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│           BusinessChannelRepository                  │
│  ├─ getChannels / getChannel (scoped by business)   │
│  ├─ enableChannel / disableChannel                   │
│  ├─ updateChannelConfig / deleteChannel              │
│  ├─ findEnabledChannels / countEnabledChannels       │
│  └─ All queries WHERE business_id = $1              │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│            business_channels Table                   │
│  ├─ web_chat    │ enabled │ provider │ config_json  │
│  ├─ whatsapp    │ enabled │ provider │ config_json  │
│  └─ voice       │ enabled │ provider │ config_json  │
└─────────────────────────────────────────────────────┘

Delivery Path (unchanged):
  ChatService → channelRegistry.getAdapterForBusiness()
                → ChannelAdapter.sendMessage()
                  ├─ WebChatAdapter (no-op, HTTP delivers)
                  ├─ WhatsAppAdapter (stub)
                  ├─ VoiceAdapter (stub)
                  └─ SmsAdapter (stub)
```

## 8. Twilio Readiness Score: **6/10** (+1 from previous)

| Criterion | Score | Notes |
|-----------|-------|-------|
| Channel abstraction layer | ✅ 3/3 | Interface + registry + 4 registered adapters |
| Per-business channel config | ✅ 2/2 | `business_channels` with provider + config_json |
| Webhook infrastructure | ❌ 0/2 | Still no webhook routes |
| Outbound message delivery | ❌ 0/2 | Adapters exist but no Twilio SDK |
| Business credential storage | ✅ 1/1 | `config_json` ready for credentials (no SDK yet) |

Missing: Twilio SDK, webhook receiver, actual adapter implementations.

## 9. Meta Readiness Score: **5/10** (+1 from previous)

| Criterion | Score | Notes |
|-----------|-------|-------|
| Channel abstraction layer | ✅ 3/3 | Same interface works for Meta |
| Per-business credential storage | ✅ 1/2 | `config_json` exists, no schema for WABA tokens explicitly |
| Webhook infrastructure | ❌ 0/2 | Still missing |
| Template approval workflow | ❌ 0/2 | Not started |
| Phone number management | ✅ 1/1 | `config_json` field ready for phone numbers |

## 10. Remaining Architecture Risks

### Risk 1: No Webhook Inbound Infrastructure (CRITICAL)
WhatsApp/Voice/SMS messages enter as webhooks. No webhook receiver exists. Until this is built, external channels cannot receive inbound messages.

### Risk 2: Frontend Permanently Coupled to `web_chat`
`chat-context.tsx:62` hardcodes `channelType: 'web_chat'`. WhatsApp/Voice flows must come from separate clients (webhooks, mobile apps).

### Risk 3: Two Channel Interface Hierarchies
`ChannelAdapter` (message delivery) and `RecoveryChannel` (follow-up) are independent. WhatsApp will need to implement both interfaces — a common base would reduce duplication.

### Risk 4: Recovery Default Sequence Is All-WebChat
`recovery.service.ts:145-151` defaults to three `web_chat` recovery steps. WhatsApp-only businesses need explicit `recoveryConfig`.

### Risk 5: ChatService Creates Conversations Before Checking Channel Enabled
`chat.service.ts` does not call `channelService.assertChannelEnabled()` before processing. A message arriving for a disabled channel would be processed and persisted before the adapter throws at delivery.

### Risk 6: Multiple Hardcoded `'web_chat'` Strings
`PublicController`, `AppointmentController`, `FollowUpService`, and the frontend all hardcode `'web_chat'`. These will need refactoring once non-web channels are active.

## 11. Rollback Plan

1. **Migration down:** `npm run migrate:down` (drops `business_channels` table)
2. **Code revert:** Revert `settings.controller.ts`, `settings.routes.ts`, `repositories/index.ts`, `channel-registry.ts`, `channel/index.ts`, `types/index.ts`
3. **Frontend revert:** Revert `settings/page.tsx`
4. **Verify:** `npx tsc --noEmit` on both frontend and backend

No existing data is affected by a rollback since the migration is purely additive.

## 12. Deployment Order

1. Run migration `1728000000000_create-business-channels.ts`
2. Deploy backend (new endpoints, registry upgrade, service layer)
3. Deploy frontend (settings channels tab)
4. Verify existing POST /api/chat still works
5. Verify GET /settings/channels returns configured channels
6. Verify disabling web_chat is blocked when alone

## 13. Definition of Done Checklist

- [x] `ChannelType` enum — exists (no changes needed)
- [x] `conversations.channel_type` — exists (no changes needed)
- [x] `customer_channels` — exists (no changes needed)
- [x] Channel abstraction layer — upgraded (all 4 adapters registered)
- [x] Per-business channel config — `business_channels` table
- [x] Migration with seed data — auto-seeds web_chat for all businesses
- [x] Repository with tenant enforcement — `business-channel.repository.ts`
- [x] Service with validation + business rules — `channel.service.ts`
- [x] Business rule: at least one channel — enforced in `disableChannel` and `updateChannel`
- [x] Capability system — `channel-capabilities.ts`
- [x] Owner dashboard — Settings → Channels tab
- [x] No Twilio code — not integrated
- [x] No Meta code — not integrated
- [x] No webhook routes — not created
- [x] No provider lock-in — adapter pattern + config_json
- [x] TypeScript compiles clean — both frontend and backend
- [x] Existing flows preserved — no changes to ChatService, booking, leads, analytics, Founder OS
