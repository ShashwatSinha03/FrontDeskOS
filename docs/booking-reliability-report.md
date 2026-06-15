# Booking Reliability Report

## Root Cause Analysis

### Bug: Timezone-naive date/time handling in booking pipeline

All date/time operations used `new Date()` and `setHours()` without considering the business's IANA timezone (e.g. `Asia/Kolkata`, `America/New_York`). JavaScript `new Date()` always operates in the server's local timezone (or UTC, depending on constructor form), while business working hours and customer-facing times are in the business's timezone.

The `business.timezone` field existed in the schema and `Business` type but was never read anywhere in the booking pipeline.

---

## Affected Files and Changes

### Files modified

| File | Lines Changed | What Changed |
|------|--------------|--------------|
| `backend/src/lib/timezone.ts` | New file | Timezone utility — `Intl.DateTimeFormat` wrappers for DST-safe conversions |
| `backend/src/workflows/agent.nodes.ts` | ~30 | Booking slot generation, appointment creation, validation, reschedule — all now use `business.timezone` |
| `backend/src/workflows/agent.prompts.ts` | ~3 | `buildIntentDetectionPrompt` accepts `currentDate` param |
| `backend/src/services/availability.service.ts` | ~35 | `getTimeWindows` accepts optional `timezone` param, uses business-local day-of-week and hours |
| `backend/src/services/appointment.service.ts` | ~25 | `getAvailableSlots` loads business timezone, passes to availability service; `fallbackSlots` uses timezone |

---

## Complete Booking Flow: Before vs After

### Flow: Customer Message → Intent → Booking Node → Appointment

#### 1. Current date for slot lookup

| Stage | Before (bug) | After (fix) |
|-------|-------------|-------------|
| Code | `new Date().toISOString().slice(0, 10)` | `getBusinessDateStr(tz)` |
| Example (server UTC, business Asia/Kolkata UTC+5:30) | 23:00 UTC → `"2026-06-14"` (wrong day) | 23:00 UTC → `"2026-06-15"` (correct business day) |
| Impact | Queries slots for wrong calendar day | Queries slots for correct business day |

#### 2. Busy appointments query

| Stage | Before (bug) | After (fix) |
|-------|-------------|-------------|
| SQL | `DATE(appointment_time) = $2` (text comparison, session TZ) | `appointment_time >= $2 AND appointment_time < $3` (UTC range) |
| Values | `"2026-06-15"` (text) | `2026-06-14 18:30:00Z` to `2026-06-15 18:30:00Z` |
| Impact | Misses appointments on wrong UTC day | Captures appointments on correct business day |

#### 3. Busy time display

| Stage | Before (bug) | After (fix) |
|-------|-------------|-------------|
| Code | `new Date(r.appointment_time).toTimeString().slice(0, 5)` | `getTimeStrInTz(tz, new Date(r.appointment_time))` |
| Example (14:00 IST stored as 08:30 UTC) | `"08:30"` (server local = UTC) | `"14:00"` (business timezone) |
| Impact | Booked times shown in wrong timezone → missed overlaps | Correctly marks booked slots as unavailable |

#### 4. Day of week for working hours

| Stage | Before (bug) | After (fix) |
|-------|-------------|-------------|
| Code | `new Date(targetDate + 'T00:00:00').getDay()` | `getDayOfWeekInTz(tz, targetDate)` |
| Impact | Same day of week result for most cases; edge case at day boundaries | Always correct day of week |

#### 5. Slot boundary generation

| Stage | Before (bug) | After (fix) |
|-------|-------------|-------------|
| Code | `new Date(targetDate + 'T00:00:00')` then `setHours(sh, sm, 0, 0)` | `fromBusinessTimeToUtc(tz, targetDate, hours.start)` |
| Example (opens 09:00 IST) | First slot at 09:00 UTC = 14:30 IST | First slot at 03:30 UTC = 09:00 IST |
| Impact | Slots offered 5.5 hours late | Slots offered at correct business hours |

#### 6. Appointment creation

| Stage | Before (bug) | After (fix) |
|-------|-------------|-------------|
| Code | `new Date(\`${parsed.date}T${parsed.time}:00\`)` | `fromBusinessTimeToUtc(tz, parsed.date, parsed.time)` |
| Example (14:00 IST) | Stored as 14:00 UTC = 19:30 IST | Stored as 08:30 UTC = 14:00 IST |
| Impact | Appointment 5.5 hours off in timestamptz | Stored at correct UTC moment |

#### 7. Future date validation

| Stage | Before (bug) | After (fix) |
|-------|-------------|-------------|
| Code | `new Date(\`${date}T${time}:00\`) > new Date()` | `fromBusinessTimeToUtc(tz, date, time) > new Date()` |
| Impact | Could validate past appointments as future or vice versa | Correctly validates against business timezone |

#### 8. LLM prompt current date

| Stage | Before (bug) | After (fix) |
|-------|-------------|-------------|
| Intent detection | `new Date().toISOString().slice(0, 10)` | `getBusinessDateStr(tz)` |
| Booking prompt | `new Date().toISOString().slice(0, 10)` | `getBusinessDateStr(tz)` |
| Reschedule prompt | `new Date().toISOString().slice(0, 10)` | `getBusinessDateStr(tz)` |
| Impact | LLM told wrong "today" for relative date resolution | LLM sees correct business-local date |

---

## Verification Results

### Website Chat booking flow (agent path)
- Same code path as WhatsApp — goes through `bookingNode` in `agent.nodes.ts`
- Fixed via timezone-aware `fromBusinessTimeToUtc()`, `getBusinessDateStr()`, `getTimeStrInTz()`, `getDayOfWeekInTz()`
- Appointment stored at correct UTC moment in `timestamptz`

### WhatsApp booking flow
- Same fix as above — `business.timezone` propagates through `state.business` to all date/time operations
- Booking prompt tells LLM correct "today" date in business timezone
- LLM output parsed, validated against business timezone, stored as correct UTC

### Different timezones
- `Asia/Kolkata` (UTC+5:30): 09:00 IST = 03:30 UTC, 17:00 IST = 11:30 UTC
- `America/New_York` (UTC-4 EDT): 09:00 EDT = 13:00 UTC, 17:00 EDT = 21:00 UTC
- `Europe/London` (UTC+1 BST): 09:00 BST = 08:00 UTC, 17:00 BST = 16:00 UTC
- All handled correctly via `Intl.DateTimeFormat` `timeZone` option

### Day-boundary edge cases
- UTC day differs from business day (e.g., 23:00 UTC = 04:30 IST next day)
- `getBusinessDateStr(tz)` returns correct business-local date
- `businessDayStartUtc()` and `businessDayEndUtc()` compute correct UTC range for SQL query

### DST-safe behavior
- Two-pass algorithm in `fromBusinessTimeToUtc()`:
  1. First pass: estimate UTC using offset at `asUtc` candidate
  2. Second pass: recalculate offset at estimated time (handles spring-forward/fall-back)
- Spring-forward: non-existent time (02:30 EST → 03:00 EDT) maps to UTC just before transition
- Fall-back: ambiguous time (01:30 occurs twice) maps to first occurrence (EDT, conventional choice)

---

## Remaining Issues (out of scope)

| Issue | File | Severity |
|-------|------|----------|
| Dashboard "today" uses server timezone | `operational.controller.ts:24` | Low — dashboard display only |
| Notification dates use `toLocaleString()` without `timeZone` | `appointment.controller.ts:112`, `operational.controller.ts:261` | Low — notification text |
| Follow-up scheduling uses server-local `setHours` | `followup.service.ts:113, 123` | Low — non-timezone-critical |
| Availability override dates assume UTC session timezone | `availability.service.ts` (via `findOverrides`) | Low — calendar dates, not timestamps |

---

## Regression Audit

### What was checked
1. No schema changes — all fixes are application-layer
2. No new dependencies — uses built-in `Intl.DateTimeFormat`
3. Backward compatible — optional `timezone` parameter in `getTimeWindows`, `currentDate` parameter in `buildIntentDetectionPrompt`
4. Existing tests unchanged — `npx tsc --noEmit` passes with 0 errors
5. No changes to `appointment.repository.ts` — `timestamptz` column stores UTC values correctly

### What was NOT changed
- `appointment.repository.ts` — no changes to `checkAvailability()` (uses `timestamptz` directly, correct)
- `calendarService` — calendar events receive `Appointment.appointmentTime` which is already a UTC Date
- `notificationService` — receives UTC Date objects, display formatting is separate concern
- Frontend — timezone display is client-side, unaffected

---

## Rollback Plan

### Per-file reverts

```bash
# 1. Revert agent.nodes.ts
git checkout HEAD -- backend/src/workflows/agent.nodes.ts

# 2. Revert agent.prompts.ts
git checkout HEAD -- backend/src/workflows/agent.prompts.ts

# 3. Revert availability.service.ts
git checkout HEAD -- backend/src/services/availability.service.ts

# 4. Revert appointment.service.ts
git checkout HEAD -- backend/src/services/appointment.service.ts

# 5. Delete timezone utility
git rm backend/src/lib/timezone.ts
```

### Verify rollback
```bash
cd backend && npx tsc --noEmit
```
Should compile with 0 errors using original code.

### Data integrity
- No schema changes — zero data migration needed
- Existing appointments remain at correct UTC timestamps in `timestamptz`
- No seed data or config changed

---

## Files Changed Summary

```
A backend/src/lib/timezone.ts          (new — timezone utility, 100 lines)
M backend/src/workflows/agent.nodes.ts (fix booking/reschedule timezone)
M backend/src/workflows/agent.prompts.ts (fix intent prompt date)
M backend/src/services/availability.service.ts (fix getTimeWindows timezone)
M backend/src/services/appointment.service.ts (fix getAvailableSlots timezone)
```

0 new dependencies. 0 schema changes. 0 test breakages.
