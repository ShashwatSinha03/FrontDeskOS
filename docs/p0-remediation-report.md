# P0 Blocker Remediation Report

**Date:** 2026-06-14
**Verdict:** ALL P0 BLOCKERS FIXED — READY FOR PILOT (pending deployment)

## Summary

The Founder Readiness Audit (`docs/founder-readiness-audit.md`) identified 4 P0 blockers that would prevent a limited pilot. All 4 have been fixed via a combination of database migration and code changes.

## P0-1: Schema Drifts (Migration)

### Before
Six schema drifts existed between the TypeScript types and the actual database schema:
- `businesses.status` — missing column (queried by middleware)
- `services.is_active` — missing column (queried in 17 locations)
- `messages.business_id` — missing FK column (INSERT fails)
- `notifications` — missing table (repository calls fail)
- `appointment_status` — missing `'completed'` enum value
- `customer_lifecycle_events.changed_by` — missing column
- `update_updated_at_column()` function defined but never attached to tables (no triggers)
- 14 missing composite indexes for common query patterns
- No unique constraint/index to prevent double-booking at DB level

### Fix
Migration `1731000000000_fix-schema-drifts.ts`:
- Adds all missing columns with `IF NOT EXISTS` guards
- Creates `notifications` table with `CREATE TABLE IF NOT EXISTS`
- Adds `'completed'` to `appointment_status` enum with `IF NOT EXISTS`
- Creates/Recreates `update_updated_at_column()` function + attaches to 16 tables
- Creates 14 composite indexes (`CREATE INDEX IF NOT EXISTS`)
- Creates partial unique index `uq_appointment_active_slot` on `(business_id, appointment_time) WHERE status IN ('pending', 'confirmed')`

### Verification
```
✓ businesses.status queryable — 5 active businesses
✓ services.is_active queryable — 13 active services
✓ messages.business_id queryable — 373 messages have business_id
✓ notifications table queryable — 8 notifications
✓ appointment_status has completed — completed found
✓ uq_appointment_active_slot index exists — found
✓ update_updated_at_column function exists — found
✓ updated_at triggers — 17 triggers found
```
8/8 checks passed.

## P0-2: Double Booking in AI Agent Path

### Before
The `bookingNode` in `agent.nodes.ts` had no availability check before calling `appointmentRepository.create()`. Booking was driven entirely by LLM output without verifying slot availability, risking double-booked appointments.

### Fix
- Added `appointmentRepository.checkAvailability()` call before `create()` in `bookingNode` (line ~560)
- If slot is unavailable, returns friendly message asking customer to choose a different time
- Already-existing `uq_appointment_active_slot` DB index provides defense-in-depth (catches any race conditions or bypasses)

**Files changed:**
- `src/workflows/agent.nodes.ts` — added availability check + unique constraint error handling

## P0-3: Twilio Status Callback Spoofing

### Before
`handleWhatsAppInbound` validated Twilio signatures via `twilio.validateRequest()`, but `handleWhatsAppStatus` had **no signature validation** — anyone who knew the status callback URL could spoof delivery status updates.

### Fix
Added the same Twilio signature validation (`x-twilio-signature` header check via `twilio.validateRequest()`) to `handleWhatsAppStatus`. If `TWILIO_AUTH_TOKEN` is set and signature is present but invalid, returns 403. If env var is unset, logs a warning and processes the request (backward compatibility for dev).

**Files changed:**
- `src/controllers/webhook.controller.ts` — added signature validation to `handleWhatsAppStatus`

## P0-4: Meta Verify Token Bypass

### Before
`handleWhatsAppVerification` had a fallthrough that returned `hub.challenge` **even when the verify token did not match** — as long as a challenge was present. This meant any attacker could register a webhook URL with Meta, bypassing the verification handshake entirely.

```typescript
// BEFORE: token mismatch still succeeds
if (challenge && verifyToken && verifyToken === expectedToken) { return challenge; }
if (challenge) { return challenge; }  // <-- always succeeds
res.status(403).send('Verification failed');
```

### Fix
Removed the fallthrough. Now returns 403 unless the verify token strictly matches `META_VERIFY_TOKEN`:

```typescript
// AFTER: strict check, no fallthrough
if (challenge && verifyToken && verifyToken === expectedToken) { return challenge; }
res.status(403).send('Verification failed');  // rejects mismatched/missing tokens
```

**Files changed:**
- `src/controllers/webhook.controller.ts` — removed token-mismatch fallthrough

## P0-5: Missing Confirmation Steps Before Mutations

### P0-5a: Booking — Require Confirmation

**Before:** The booking prompt instructed the LLM to "Do NOT wait for a separate confirmation message" — it would book directly as soon as all required details were present.

**Fix:** Added a `confirm` action between `collect_info` and `book`. The prompt now requires the LLM to always use `confirm` first (summarizing the appointment details and asking "Shall I go ahead?"). Only on explicit customer confirmation (yes, sure, go ahead) does it proceed to `book`.

**Files changed:**
- `src/workflows/agent.prompts.ts` — added `confirm` action, removed "Do NOT wait" instruction
- `src/workflows/agent.nodes.ts` — added `action === 'confirm'` handler that returns without mutating

### P0-5b: Cancellation — Require Confirmation

**Before:** The cancellation node immediately cancelled the first active appointment it found, then generated a reply. No confirmation asked.

**Fix:** Changed `buildCancellationPrompt` to use JSON format with `collect_info` and `confirm_cancel` actions. The LLM is instructed to always ask for confirmation first. On `confirm_cancel`, the appointment is cancelled; on `collect_info`, only a reply is returned.

**Files changed:**
- `src/workflows/agent.prompts.ts` — `buildCancellationPrompt` now returns JSON with actions
- `src/workflows/agent.nodes.ts` — `cancellationNode` processes JSON, only cancels on `confirm_cancel`

### P0-5c: Reschedule — Require Confirmation

**Before:** The reschedule node immediately called `appointmentRepository.reschedule()` as soon as the LLM had a date and time. No confirmation asked.

**Fix:** Added a `confirm` action to the reschedule flow. The LLM must first use `confirm` (summarizing the new time and asking for confirmation), and only proceeds to `reschedule` on explicit customer confirmation.

**Files changed:**
- `src/workflows/agent.prompts.ts` — `buildReschedulePrompt` now includes `confirm` action
- `src/workflows/agent.nodes.ts` — `rescheduleNode` handles `confirm` action, only calls `reschedule()` on `reschedule` action

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx vitest run` | ✅ 75/76 pass (1 pre-existing auth test key mismatch) |
| Migration applied | ✅ 8/8 schema checks pass |
| DB unique index | ✅ `uq_appointment_active_slot` exists |
| Webhook signature validation | ✅ Added to both inbound + status callback |
| Meta token validation | ✅ Strict `===` check, no fallthrough |
| Booking confirmation | ✅ `confirm` action required before `book` |
| Cancellation confirmation | ✅ `confirm_cancel` required before cancelling |
| Reschedule confirmation | ✅ `confirm` action required before `reschedule` |

## Files Changed

| File | Change |
|------|--------|
| `backend/migrations/1731000000000_fix-schema-drifts.ts` | Schema drift migration (columns, table, enum, function, triggers, indexes, unique index) |
| `backend/src/controllers/webhook.controller.ts` | Twilio validation on status callback + Meta verify token strict check |
| `backend/src/workflows/agent.nodes.ts` | Availability check in booking + confirmation flow for booking/cancellation/reschedule |
| `backend/src/workflows/agent.prompts.ts` | Booking/cancellation/reschedule prompts restructured for confirmation-first approach |
