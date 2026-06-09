# BrightSmile Seed Validation Report

## Issue Found and Fixed

| # | Type | Line(s) | Description | Fixed |
|---|---|---|---|---|
| 1 | Invalid UUID | 58-62 | Service IDs used `svc-` prefix (`svc-b7a2-0001-...`) which is not valid hex. PostgreSQL rejects with `invalid input syntax for type uuid` | Replaced with `b7a2f4c1-d93e-48d6-95bc-00000000000X` (valid RFC 4122) |

## UUID Inventory

### Valid UUIDs (not changed)

| UUID | Format Check | Used As | FK References |
|---|---|---|---|
| `b7a2f4c1-d93e-48d6-95bc-79f94eb97220` | v4, RFC 4122 ✓ | business.id, FK target | services, staff_profiles, availability_schedules, customers |
| `00000000-0000-0000-0000-000000000002` | nil UUID, accepted by PG ✓ | staff_profiles.user_id | auth.users (external — pre-existing convention) |
| `c0a80121-0002-4000-8000-000000000001` | v4, RFC 4122 ✓ | customers.id | — |
| `c0a80121-0002-4000-8000-000000000002` | v4, RFC 4122 ✓ | customers.id | — |
| `c0a80121-0002-4000-8000-000000000003` | v4, RFC 4122 ✓ | customers.id | — |
| `c0a80121-0002-4000-8000-000000000004` | v4, RFC 4122 ✓ | customers.id | — |
| `c0a80121-0002-4000-8000-000000000005` | v4, RFC 4122 ✓ | customers.id | — |

### Fixed UUIDs

| Old Value | New Value | FK Target |
|---|---|---|
| `svc-b7a2-0001-4000-8000-000000000001` | `b7a2f4c1-d93e-48d6-95bc-000000000001` | business: `b7a2f4c1-d93e-48d6-95bc-79f94eb97220` |
| `svc-b7a2-0001-4000-8000-000000000002` | `b7a2f4c1-d93e-48d6-95bc-000000000002` | business: `b7a2f4c1-d93e-48d6-95bc-79f94eb97220` |
| `svc-b7a2-0001-4000-8000-000000000003` | `b7a2f4c1-d93e-48d6-95bc-000000000003` | business: `b7a2f4c1-d93e-48d6-95bc-79f94eb97220` |
| `svc-b7a2-0001-4000-8000-000000000004` | `b7a2f4c1-d93e-48d6-95bc-000000000004` | business: `b7a2f4c1-d93e-48d6-95bc-79f94eb97220` |
| `svc-b7a2-0001-4000-8000-000000000005` | `b7a2f4c1-d93e-48d6-95bc-000000000005` | business: `b7a2f4c1-d93e-48d6-95bc-79f94eb97220` |

## Additional Type Checks

### Enum Values
All `lifecycle_state` values used (`New Inquiry`, `Qualified`, `Booking Opportunity`, `Booked`, `Follow-Up Pending`) are valid members of the `customer_lifecycle_state` enum. ✓

### JSON Validity
All three JSONB fields (faqs, escalation_rules, appointment_settings) pass JSON syntax validation. All keys and values are correctly quoted. ✓

### NOT NULL Columns
Every INSERT provides all required NOT NULL columns for its target table. ✓

### CHECK Constraints
- `services`: `price_min <= price_max` — satisfied by all 5 rows ✓
- `services`: `duration_minutes > 0` — satisfied by all 5 rows ✓
- `availability_schedules`: `start_time < end_time` — satisfied by all 6 rows ✓
- `customers`: `profile_has_identity` — David Kim has NULL email but name + phone are present ✓

### Foreign Key Integrity
All `business_id` references point to `b7a2f4c1-d93e-48d6-95bc-79f94eb97220` which is inserted on line 6. ✓

## Unseeded Tables (no data in this file)

The following tables have no seed data in `seed-brightsmile.sql`:
- `conversations`
- `messages`
- `appointments`
- `customer_channels`
- `customer_sessions`
- `escalations`
- `knowledge_requests`
- `follow_ups`
- `voice_calls`
- `availability_overrides`
- `calendar_credentials`
- `customer_lifecycle_events`

This is by design — this file only seeds business + services + staff + customers + availability.

## Execution Order

```sql
-- 1. Schema first
\i database/schema.sql

-- 2. BrightSmile seed second
\i database/seed-brightsmile.sql
```

## Result

**Zero remaining issues.** The corrected file will execute without UUID, enum, JSON, constraint, or NOT NULL errors.
