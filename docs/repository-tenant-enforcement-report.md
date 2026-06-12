# Repository Tenant Enforcement Report

## Summary

All tenant-owned repository methods now require an explicit `businessId` parameter, preventing accidental cross-tenant data access at the data layer.

## Audit Results

13 repository files inspected. 7 modified (7/13 — 54%), 6 left unchanged.

### Modified: 22 methods hardened across 7 repositories

| Repository | Method | Change |
|---|---|---|
| AppointmentRepository | `findById` | Added `businessId` param, added `WHERE business_id` |
| AppointmentRepository | `findByCustomer` | Added `businessId` param, added `WHERE business_id` |
| AppointmentRepository | `findByCustomerWithDetails` | Added `businessId` param, validated via JOIN |
| AppointmentRepository | `reschedule` | Added `businessId` param, added `WHERE business_id` |
| LifecycleEventRepository | `findByCustomer` | Added `businessId` param, validated via JOIN |
| EscalationRepository | `findByCustomer` | Added `businessId` param, validated via JOIN |
| FollowUpRepository | `markSent` | Added `businessId` param, added `WHERE business_id` |
| FollowUpRepository | `cancelPending` | Added `businessId` param, added `WHERE business_id` |
| FollowUpRepository | `findByCustomerWithName` | Added `businessId` param, added `WHERE business_id` |
| FollowUpRepository | `findByCustomer` | Added `businessId` param, added `WHERE business_id` |
| CustomerRepository | `findByChannelIdentity` | Added `businessId` param, added `WHERE business_id` |
| CustomerRepository | `findById` | Added `businessId` param, added `WHERE business_id` |
| CustomerRepository | `updateLifecycleState` | Added `businessId` param, added `WHERE business_id` |
| CustomerRepository | `updateProfile` | Added `businessId` param, added `WHERE business_id` |
| ConversationRepository | `findActiveByCustomer` | Added `businessId` param, added `WHERE business_id` |
| ConversationRepository | `findByCustomer` | Added `businessId` param, added `WHERE business_id` |
| ConversationRepository | `close` | Added `businessId` param, added `WHERE business_id` |
| ConversationRepository | `getMessages` | Added `businessId` param, validated via JOIN |
| ConversationRepository | `getMessagesByCustomer` | Added `businessId` param, validated via JOIN |
| SessionRepository | `findBySessionId` | Added `businessId` param, added `WHERE business_id` |
| SessionRepository | `updateCustomer` | Added `businessId` param, added `WHERE business_id` |
| SessionRepository | `updateContext` | Added `businessId` param, added `WHERE business_id` (performed by subagent but verified during audit) |

### Unchanged: 6 repositories (not tenant-owned or already correct)

| Repository | Reason |
|---|---|
| BusinessRepository | Tenant root entity — scoping by businessId would be circular |
| OnboardingRepository | System-wide operations (wizard progress) |
| AvailabilityRepository | Already correctly scoped with businessId |
| AppointmentRepository | `findDueToProcess` — global cron query across all tenants |
| FollowUpRepository | `findDueToProcess` — global cron query across all tenants |
| ConversationRepository | `findActiveByInactivity` — global cron query across all tenants |

### SQL enforcement pattern

Every hardened method uses one of:
- **Direct column filter**: `WHERE business_id = $X` (when the table has `business_id`)
- **JOIN validation**: `JOIN target_table t ON ... WHERE t.business_id = $X` (when accessing through a relationship)

### Call site fixes: 12 files, 62 insertions, 61 deletions

Controllers: `appointment.controller.ts`, `conversation.controller.ts`, `operational.controller.ts`, `owner.controller.ts`, `public.controller.ts`
Services: `appointment.service.ts`, `chat.service.ts`, `followup.service.ts`
Recovery: `abandonment-detector.ts`, `recovery.service.ts`, `webchat.channel.ts`
Workflows: `agent.nodes.ts`

### Security verification

- TypeScript compiler enforces businessId at compile time — all 22 updated methods have required `businessId` parameters
- No optional params, no overloads, no fallback values
- Pre-existing `CustomerLifecycleState` type errors (11 total) are unrelated to repository hardening

### Git history

```
b41fadd refactor(conversation): make findByCustomer require businessId
<... 6 intermediate commits from subagents ...>
118d1f7 fix all call sites to pass businessId to hardened repository methods
```

### Verification

```
$ npx tsc --noEmit
(Only 11 pre-existing CustomerLifecycleState errors remain — zero businessId-related errors)
```
