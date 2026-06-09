# Appointment Engine — Design Document

## Overview
Replace the bare-minimum appointment CRUD with a complete engine supporting service-specific durations, recurring availability, custom availability overrides, booking with conflict detection, reschedule chains, cancellations with reasons, and a CalendarProvider abstraction for future external calendar sync.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AppointmentController                  │
├─────────────────────────────────────────────────────────────┤
│  AppointmentService    AvailabilityService    CalendarService │
├──────────────────┬─────────────────────┬────────────────────┤
│ AppointmentRepo   │ AvailabilityRepo    │ CalendarProvider   │
│ (appointments)    │ (schedules +        │ (interface)        │
│                   │  overrides)         │ ┌────────────────┐ │
│                   │                     │ │LocalCalProvider│ │
│                   │                     │ │(default impl)  │ │
│                   │                     │ └────────────────┘ │
└──────────────────┴─────────────────────┴────────────────────┘
```

## Database Schema Changes

### availability_schedules
```sql
CREATE TABLE availability_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT time_range_check CHECK (start_time < end_time)
);
```

### availability_overrides
```sql
CREATE TABLE availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  reason VARCHAR(255),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT override_time_range CHECK (
    (is_available = TRUE AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
    OR (is_available = FALSE)
  )
);
```

### calendar_credentials
```sql
CREATE TABLE calendar_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### appointments additions
- `cancellation_reason TEXT` — reason provided at cancellation time
- `rescheduled_from_id UUID REFERENCES appointments(id) ON DELETE SET NULL` — points to previous appointment in the reschedule chain

## TypeScript Types

### New types in backend/src/types/index.ts
```typescript
export interface AvailabilitySchedule {
  id: string;
  businessId: string;
  serviceId: string | null;
  dayOfWeek: number;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  effectiveFrom: Date;
  effectiveUntil: Date | null;
}

export interface AvailabilityOverride {
  id: string;
  businessId: string;
  serviceId: string | null;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  isAvailable: boolean;
}

export interface CalendarCredentials {
  id: string;
  businessId: string;
  provider: 'google' | 'outlook';
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  calendarId: string | null;
  isActive: boolean;
}

export interface CalendarEvent {
  id: string;
  appointmentId: string;
  externalEventId: string;
  provider: string;
  calendarUrl?: string;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'rescheduled';
// Appointment interface enhanced with:
// cancellationReason?: string;
// rescheduledFromId?: string;
```

### CalendarProvider interface (calendar.service.ts)
```typescript
export interface CalendarProvider {
  createEvent(appointment: Appointment, service: Service | null): Promise<{ externalEventId: string; calendarUrl?: string }>;
  updateEvent(appointment: Appointment, service: Service | null): Promise<void>;
  cancelEvent(externalEventId: string): Promise<void>;
}
```

## Service Logic

### Availability Computation (availability.service.ts)
1. Look up all `availability_schedules` for business + service (fall back to business-wide if no service-specific)
2. Filter to schedules active on the given date's day_of_week and within effective range
3. Look up all `availability_overrides` for that date
4. Merge: union of applicable schedules minus blocked overrides, add custom-hour overrides
5. Return resolved time windows for that date

### Slot Generation (appointment.service.ts)
1. Call availability service to get time windows for the date
2. Load the service's `durationMinutes`
3. For each window, generate slots at `durationMinutes` granularity
4. Subtract booked slots (existing checkAvailability logic)
5. Apply buffer constraints from business settings
6. Return available slots with their associated service

### Booking Flow
1. Validate business, customer, service exist
2. Check time is within computed availability for that service's duration
3. Check no overlap with existing appointments
4. Create appointment (status = 'pending')
5. Transition customer lifecycle to 'Booked'
6. If business has active calendar provider, sync event
7. Return appointment

### Reschedule Flow
1. Find existing appointment
2. Validate new time against availability
3. Set old appointment status = 'rescheduled' with rescheduledToId pointing to new
4. Create new appointment with rescheduledFromId pointing to old
5. If external calendar, update event

### Cancellation Flow
1. Set status = 'cancelled'
2. Record cancellation_reason
3. Reset customer lifecycle state to 'Follow-Up Pending'
4. If external calendar, delete event

## API Routes

### Existing (enhanced)
- `GET /appointments` — now also filterable by serviceId
- `GET /appointments/slots` — now accepts optional serviceId, returns { time, serviceId, durationMinutes }
- `POST /appointments/book` — validates service-specific duration in slot check
- `POST /appointments/:id/cancel` — accepts `reason` in body

### New endpoints
- `POST /appointments/:id/reschedule` — body: { newTime: ISO string }
- `POST /appointments/:id/confirm` — confirm a pending appointment
- `GET /availability/schedules?businessId=...` — list recurring schedules
- `POST /availability/schedules` — create schedule
- `DELETE /availability/schedules/:id` — delete schedule
- `GET /availability/overrides?businessId=...` — list overrides (optional date filter)
- `POST /availability/overrides` — create override
- `DELETE /availability/overrides/:id` — delete override

## Implementation Order
1. Database schema migration (new tables + appointments additions)
2. TypeScript types (availability_schedule, availability_override, calendar interfaces)
3. Availability repository + service
4. Enhanced appointment repository (reschedule, cancel with reason)
5. Calendar service (LocalCalendarProvider)
6. Enhanced appointment service (uses availability + calendar)
7. Availability controller + routes
8. Enhanced appointment controller + routes
9. Frontend API client updates
10. Frontend type sync
