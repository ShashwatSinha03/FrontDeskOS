# Pilot Success Metrics

**Sprint:** Launch Readiness
**Measurement cadence:** Weekly (every Monday)
**Tracking:** Manual spreadsheet or ops dashboard query

---

## Core Metrics (Tracked Weekly)

Aggregated across all active pilot customers.

| Metric | Definition | Data Source | Weekly Target |
|---|---|---|---|
| **Leads Captured** | Total unique customer conversations initiated (distinct session IDs) | `leads` table — count distinct `session_id` | Track baseline |
| **Appointments Booked** | Total confirmed appointments (status = confirmed) | `appointments` table — count where `status = 'confirmed'` | Track baseline |
| **Appointments Completed** | Total attended appointments (status = completed) | `appointments` table — count where `status = 'completed'` | Track baseline |
| **Escalations Raised** | Total escalations triggered (customer asked for human, or AI confidence low) | `escalations` table — count created this week | Track baseline |
| **Escalations Resolved** | Total escalations closed (status = resolved) | `escalations` table — count where `status = 'resolved'` | Track baseline |

---

## Derived Metrics

Calculated from core metrics each week.

| Metric | Formula | Target |
|---|---|---|
| **Booking Rate** | Appointments Booked / Leads Captured | **≥ 15%** |
| **Completion Rate** | Appointments Completed / Appointments Booked | **≥ 75%** |
| **Escalation Rate** | Escalations Raised / Leads Captured | Monitor (< 10% desired, no hard target yet) |
| **Resolution Rate** | Escalations Resolved / Escalations Raised | **≥ 90%** |

> **Interpretation Note:** A low Booking Rate may indicate friction in the booking flow or that the AI isn't effectively guiding customers to book. A low Resolution Rate suggests owners aren't responding to escalations — may need a notification review.

---

## Business Metrics (Tracked Per Customer)

Measured individually for each pilot customer.

| Metric | Definition | Notes |
|---|---|---|
| **Active Days** | Number of days in the week with at least one customer interaction (lead or appointment) | Measures engagement consistency — target 5+/7 days |
| **Response Time** | Average time (seconds) from customer message to AI first response | Track via chat message timestamps; target < 3 seconds |
| **Missed Opportunities** | Number of chat messages or booking attempts received outside business hours that were not captured | Indicates need for off-hours handling improvements |
| **Avg Conversation Length** | Average number of messages per customer session | Helps gauge engagement depth |
| **Customer Satisfaction (CSAT)** | Post-interaction rating (thumbs up/down or 1–5) | Optional; implement after pilot begins |

---

## Target Thresholds

| Metric | Threshold | Action if Below Threshold |
|---|---|---|
| Booking Rate | ≥ 15% | Review AI conversation flow; check if booking hand-off is clear |
| Completion Rate | ≥ 75% | Check no-show rate; verify appointment reminders working |
| Resolution Rate | ≥ 90% | Review escalation notifications; check owner responsiveness |
| Response Time | < 3 seconds | Monitor LLM latency; consider provider switch if consistently high |
| Active Days | ≥ 5 / 7 | Customer may need re-engagement or training refresher |

---

## Reporting Format

Weekly summary (one row per week per customer):

```
Customer    | Week      | Leads | Booked | Completed | Escalated | Resolved | Booking% | Completion% | Resolution%
------------|-----------|-------|--------|-----------|-----------|----------|----------|-------------|-------------
BrightSmile | 2026-W24  | 42    | 12     | 10        | 3         | 3        | 28.6%    | 83.3%       | 100%
Apex Dental | 2026-W24  | 18    | 2      | 1         | 5         | 4        | 11.1%    | 50.0%       | 80%
```

---

## Pilot Success Criteria

The pilot is considered successful when:

1. **At least 3 customers** have been active for ≥ 2 weeks
2. **Booking Rate ≥ 15%** aggregated across all customers
3. **Completion Rate ≥ 75%** aggregated
4. **Resolution Rate ≥ 90%** aggregated
5. **Zero critical bugs** reported (chat down, booking failures, data loss)
6. **At least 1 customer** provides positive qualitative feedback

---

## Data Collection Method

Until a dashboard exists, collect metrics via:

```sql
-- Weekly leads
SELECT COUNT(DISTINCT session_id) AS leads_captured
FROM leads
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Weekly bookings
SELECT COUNT(*) AS appointments_booked
FROM appointments
WHERE status = 'confirmed'
  AND created_at >= NOW() - INTERVAL '7 days';

-- Weekly completed
SELECT COUNT(*) AS appointments_completed
FROM appointments
WHERE status = 'completed'
  AND updated_at >= NOW() - INTERVAL '7 days';

-- Weekly escalations
SELECT
  COUNT(*) AS escalations_raised,
  COUNT(*) FILTER (WHERE status = 'resolved') AS escalations_resolved
FROM escalations
WHERE created_at >= NOW() - INTERVAL '7 days';
```

Queries should be scoped per `business_id` when tracking per customer.
