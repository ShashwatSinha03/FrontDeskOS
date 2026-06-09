# Appointment Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a complete Appointment Engine with service-specific durations, recurring/custom availability, booking, reschedule, cancellation, and a CalendarProvider abstraction.

**Architecture:** Normalized availability tables (`availability_schedules`, `availability_overrides`) replace the primitive JSONB working-hours approach. A `CalendarProvider` interface with a `LocalCalendarProvider` default ships in this pass; Google/Outlook providers are future additions. Service-specific duration drives slot generation at the per-service level.

**Tech Stack:** TypeScript, Express.js, PostgreSQL (raw `pg`), Zod validation, Supabase RLS.

**Design doc:** `docs/plans/2026-06-07-appointment-engine-design.md`

---

### Task 1: Database Schema Migration (new tables + columns)

**Files:**
- Modify: `database/schema.sql`

**Step 1: Add new tables and columns to schema.sql**

Add after the `appointments` table definition (around line 199), before the `escalations` table:

```sql
-- ==========================================
-- AVAILABILITY SCHEDULES (recurring weekly patterns)
-- ==========================================
CREATE TABLE IF NOT EXISTS availability_schedules (
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

-- ==========================================
-- AVAILABILITY OVERRIDES (date-specific exceptions)
-- ==========================================
CREATE TABLE IF NOT EXISTS availability_overrides (
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

-- ==========================================
-- CALENDAR CREDENTIALS (for future OAuth integrations)
-- ==========================================
CREATE TABLE IF NOT EXISTS calendar_credentials (
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

Add columns to `appointments` table. After `notes TEXT,` line (around line 196):

```sql
  cancellation_reason TEXT,
  rescheduled_from_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
```

Add indexes after the existing appointment indexes (around line 401):

```sql
CREATE INDEX idx_availability_schedules_business ON availability_schedules(business_id);
CREATE INDEX idx_availability_schedules_day ON availability_schedules(business_id, day_of_week);
CREATE INDEX idx_availability_overrides_date ON availability_overrides(business_id, date);
CREATE INDEX idx_appointments_rescheduled_from ON appointments(rescheduled_from_id) WHERE rescheduled_from_id IS NOT NULL;
```

Add RLS policies after existing appointment RLS (around line 560):

```sql
-- RLS POLICIES: availability_schedules
ALTER TABLE availability_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_manage_availability_schedules ON availability_schedules
  FOR ALL TO authenticated USING (business_id = current_user_business_id()) WITH CHECK (business_id = current_user_business_id());

-- RLS POLICIES: availability_overrides
ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_manage_availability_overrides ON availability_overrides
  FOR ALL TO authenticated USING (business_id = current_user_business_id()) WITH CHECK (business_id = current_user_business_id());

-- RLS POLICIES: calendar_credentials
ALTER TABLE calendar_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_manage_calendar_credentials ON calendar_credentials
  FOR ALL TO authenticated USING (business_id = current_user_business_id()) WITH CHECK (business_id = current_user_business_id());
```

Add triggers for the new tables (after line 296):

```sql
CREATE TRIGGER set_timestamp_availability_schedules BEFORE UPDATE ON availability_schedules FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_availability_overrides BEFORE UPDATE ON availability_overrides FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_calendar_credentials BEFORE UPDATE ON calendar_credentials FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
```

**Step 2: Verify schema syntax**

Run: `psql -f database/schema.sql` (or check with your DB tool)
Expected: No errors, tables created

---

### Task 2: TypeScript Types

**Files:**
- Modify: `backend/src/types/index.ts`
- Modify: `frontend/src/types/index.ts`

**Step 1: Add new types to backend types**

After `AppointmentSettings` interface, add:

```typescript
export interface AvailabilitySchedule {
  id: string;
  businessId: string;
  serviceId: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarCredentials {
  id: string;
  businessId: string;
  provider: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  calendarId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

Enhance the `Appointment` interface:
- Add `cancellationReason?: string;`
- Add `rescheduledFromId?: string;`

**Step 2: Sync to frontend types**

Same additions in `frontend/src/types/index.ts` (using `string` instead of `Date` for Date fields, matching the frontend convention).

---

### Task 3: Availability Repository

**Files:**
- Create: `backend/src/repositories/availability.repository.ts`
- Modify: `backend/src/repositories/index.ts`

**Step 1: Create availability.repository.ts**

```typescript
import pool from '../config/db';
import { AvailabilitySchedule, AvailabilityOverride } from '../types';

export class AvailabilityRepository {
  // --- Schedules ---
  async findSchedules(businessId: string, serviceId?: string | null): Promise<AvailabilitySchedule[]> {
    let query = `SELECT * FROM availability_schedules WHERE business_id = $1`;
    const params: any[] = [businessId];
    if (serviceId) {
      query += ` AND (service_id = $2 OR service_id IS NULL)`;
      params.push(serviceId);
    }
    query += ` ORDER BY day_of_week, start_time`;
    const res = await pool.query(query, params);
    return res.rows.map(r => this.mapSchedule(r));
  }

  async findSchedulesByDay(businessId: string, dayOfWeek: number, serviceId?: string | null): Promise<AvailabilitySchedule[]> {
    let query = `SELECT * FROM availability_schedules WHERE business_id = $1 AND day_of_week = $2`;
    const params: any[] = [businessId, dayOfWeek];
    if (serviceId) {
      query += ` AND (service_id = $3 OR service_id IS NULL)`;
      params.push(serviceId);
    }
    query += ` ORDER BY start_time`;
    const res = await pool.query(query, params);
    return res.rows.map(r => this.mapSchedule(r));
  }

  async createSchedule(data: {
    businessId: string;
    serviceId?: string | null;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    effectiveFrom?: Date;
    effectiveUntil?: Date | null;
  }): Promise<AvailabilitySchedule> {
    const query = `
      INSERT INTO availability_schedules (business_id, service_id, day_of_week, start_time, end_time, effective_from, effective_until)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const res = await pool.query(query, [
      data.businessId,
      data.serviceId || null,
      data.dayOfWeek,
      data.startTime,
      data.endTime,
      data.effectiveFrom || new Date(),
      data.effectiveUntil || null,
    ]);
    return this.mapSchedule(res.rows[0]);
  }

  async deleteSchedule(id: string): Promise<void> {
    await pool.query(`DELETE FROM availability_schedules WHERE id = $1`, [id]);
  }

  // --- Overrides ---
  async findOverrides(businessId: string, date?: Date): Promise<AvailabilityOverride[]> {
    let query = `SELECT * FROM availability_overrides WHERE business_id = $1`;
    const params: any[] = [businessId];
    if (date) {
      query += ` AND date = $2`;
      params.push(date);
    }
    query += ` ORDER BY date, start_time`;
    const res = await pool.query(query, params);
    return res.rows.map(r => this.mapOverride(r));
  }

  async findOverridesByDateRange(businessId: string, startDate: Date, endDate: Date): Promise<AvailabilityOverride[]> {
    const query = `SELECT * FROM availability_overrides WHERE business_id = $1 AND date >= $2 AND date <= $3 ORDER BY date, start_time`;
    const res = await pool.query(query, [businessId, startDate, endDate]);
    return res.rows.map(r => this.mapOverride(r));
  }

  async createOverride(data: {
    businessId: string;
    serviceId?: string | null;
    date: Date;
    startTime?: string | null;
    endTime?: string | null;
    reason?: string | null;
    isAvailable?: boolean;
  }): Promise<AvailabilityOverride> {
    const query = `
      INSERT INTO availability_overrides (business_id, service_id, date, start_time, end_time, reason, is_available)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const res = await pool.query(query, [
      data.businessId,
      data.serviceId || null,
      data.date,
      data.startTime || null,
      data.endTime || null,
      data.reason || null,
      data.isAvailable ?? true,
    ]);
    return this.mapOverride(res.rows[0]);
  }

  async deleteOverride(id: string): Promise<void> {
    await pool.query(`DELETE FROM availability_overrides WHERE id = $1`, [id]);
  }

  private mapSchedule(row: any): AvailabilitySchedule {
    return {
      id: row.id,
      businessId: row.business_id,
      serviceId: row.service_id,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      effectiveFrom: new Date(row.effective_from),
      effectiveUntil: row.effective_until ? new Date(row.effective_until) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapOverride(row: any): AvailabilityOverride {
    return {
      id: row.id,
      businessId: row.business_id,
      serviceId: row.service_id,
      date: new Date(row.date),
      startTime: row.start_time,
      endTime: row.end_time,
      reason: row.reason,
      isAvailable: row.is_available,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
```

**Step 2: Export from index.ts**

Add to `backend/src/repositories/index.ts`:
```typescript
import { AvailabilityRepository } from './availability.repository';
export const availabilityRepository = new AvailabilityRepository();
export { AvailabilityRepository };
```

---

### Task 4: Enhanced Appointment Repository

**Files:**
- Modify: `backend/src/repositories/appointment.repository.ts`

**Changes:**
- `create()` — no changes
- `updateStatus()` — no changes
- `findByBusiness()` — no changes  
- `findByCustomer()` — no changes
- `checkAvailability()` — use service-specific duration when provided
- Add `reschedule()` — create new appointment + mark old as rescheduled
- Add `cancelWithReason()` — cancel with reason
- Add `findById()` — find single appointment

Add these methods to `AppointmentRepository`:

```typescript
async findById(id: string): Promise<Appointment | null> {
  const query = `SELECT * FROM appointments WHERE id = $1`;
  const res = await pool.query(query, [id]);
  if (res.rows.length === 0) return null;
  return this.mapToEntity(res.rows[0]);
}

async reschedule(
  appointmentId: string,
  newTime: Date,
  oldStatus: AppointmentStatus = 'rescheduled',
  notes?: string
): Promise<Appointment> {
  // Mark old as rescheduled
  await this.updateStatus(appointmentId, oldStatus);

  // Get old appointment for data
  const old = await this.findById(appointmentId);
  if (!old) throw new Error('Appointment not found');

  // Create new
  const newAppt = await this.create({
    customerId: old.customerId,
    businessId: old.businessId,
    serviceId: old.serviceId,
    appointmentTime: newTime,
    notes: notes || `Rescheduled from ${old.appointmentTime.toISOString()}`,
  });

  // Link rescheduled_from on the new appointment
  await pool.query(
    `UPDATE appointments SET rescheduled_from_id = $2 WHERE id = $1`,
    [newAppt.id, appointmentId]
  );

  return newAppt;
}

async cancelWithReason(id: string, reason?: string): Promise<void> {
  const query = `
    UPDATE appointments
    SET status = 'cancelled', cancellation_reason = $2, updated_at = NOW()
    WHERE id = $1
  `;
  await pool.query(query, [id, reason || null]);
}
```

Modify `checkAvailability` to accept optional service duration override:

```typescript
async checkAvailability(businessId: string, time: Date, durationMinutes: number = 30): Promise<boolean> {
  // ... existing code (already accepts durationMinutes)
}
```

The current signature already accepts `durationMinutes`. No change needed.

---

### Task 5: Availability Service

**Files:**
- Create: `backend/src/services/availability.service.ts`
- Modify: `backend/src/services/index.ts`

**Step 1: Create availability.service.ts**

```typescript
import { availabilityRepository } from '../repositories';
import { AvailabilitySchedule, AvailabilityOverride } from '../types';

export interface TimeWindow {
  start: Date;
  end: Date;
}

export class AvailabilityService {
  async getTimeWindows(
    businessId: string,
    date: Date,
    serviceId?: string | null
  ): Promise<TimeWindow[]> {
    const dayOfWeek = date.getDay();

    // 1. Get recurring schedules for this day
    const schedules = await availabilityRepository.findSchedulesByDay(businessId, dayOfWeek, serviceId);

    // Filter to schedules effective on this date
    const effectiveSchedules = schedules.filter(s => {
      const dateStr = date.toISOString().split('T')[0];
      const fromStr = new Date(s.effectiveFrom).toISOString().split('T')[0];
      if (dateStr < fromStr) return false;
      if (s.effectiveUntil) {
        const untilStr = new Date(s.effectiveUntil).toISOString().split('T')[0];
        if (dateStr > untilStr) return false;
      }
      return true;
    });

    if (effectiveSchedules.length === 0) return [];

    // Build time windows from schedules
    const windows: TimeWindow[] = effectiveSchedules.map(s => {
      const start = new Date(date);
      const [sh, sm] = s.startTime.split(':').map(Number);
      start.setHours(sh, sm, 0, 0);

      const end = new Date(date);
      const [eh, em] = s.endTime.split(':').map(Number);
      end.setHours(eh, em, 0, 0);

      return { start, end };
    });

    // 2. Get overrides for this date
    const overrides = await availabilityRepository.findOverrides(businessId, date);

    // 3. Merge: remove blocked windows, add custom windows
    for (const override of overrides) {
      if (!override.isAvailable) {
        // Blocked: remove overlapping windows
        const blockStart = new Date(date);
        const [bsh, bsm] = (override.startTime || '00:00').split(':').map(Number);
        blockStart.setHours(bsh, bsm, 0, 0);

        const blockEnd = new Date(date);
        const [beh, bem] = (override.endTime || '23:59').split(':').map(Number);
        blockEnd.setHours(beh, bem, 0, 0);

        this.removeOverlap(windows, blockStart, blockEnd);
      } else if (override.startTime && override.endTime) {
        // Custom hours: add this window
        const customStart = new Date(date);
        const [csh, csm] = override.startTime.split(':').map(Number);
        customStart.setHours(csh, csm, 0, 0);

        const customEnd = new Date(date);
        const [ceh, cem] = override.endTime.split(':').map(Number);
        customEnd.setHours(ceh, cem, 0, 0);

        windows.push({ start: customStart, end: customEnd });
      }
    }

    // 4. Merge overlapping windows and sort
    return this.mergeWindows(windows);
  }

  private removeOverlap(windows: TimeWindow[], blockStart: Date, blockEnd: Date): void {
    for (let i = windows.length - 1; i >= 0; i--) {
      const w = windows[i];
      // No overlap
      if (w.end <= blockStart || w.start >= blockEnd) continue;

      // Window fully blocked
      if (w.start >= blockStart && w.end <= blockEnd) {
        windows.splice(i, 1);
        continue;
      }

      // Block in the middle: split
      if (w.start < blockStart && w.end > blockEnd) {
        windows.splice(i, 1, 
          { start: w.start, end: blockStart },
          { start: blockEnd, end: w.end }
        );
        continue;
      }

      // Block overlaps end
      if (w.start < blockStart) {
        windows[i] = { start: w.start, end: blockStart };
        continue;
      }

      // Block overlaps start
      if (w.end > blockEnd) {
        windows[i] = { start: blockEnd, end: w.end };
        continue;
      }
    }
  }

  private mergeWindows(windows: TimeWindow[]): TimeWindow[] {
    if (windows.length === 0) return [];
    const sorted = [...windows].sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: TimeWindow[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1];
      if (sorted[i].start <= last.end) {
        last.end = new Date(Math.max(last.end.getTime(), sorted[i].end.getTime()));
      } else {
        merged.push(sorted[i]);
      }
    }
    return merged;
  }
}

export const availabilityService = new AvailabilityService();
```

**Step 2: Export from services/index.ts**

Add to `backend/src/services/index.ts`:
```typescript
export { availabilityService, AvailabilityService } from './availability.service';
```

---

### Task 6: Calendar Service (with LocalCalendarProvider)

**Files:**
- Create: `backend/src/services/calendar.service.ts`
- Modify: `backend/src/services/index.ts`

```typescript
import { Appointment, Service } from '../types';

export interface CalendarProvider {
  createEvent(appointment: Appointment, service: Service | null): Promise<{ externalEventId: string; calendarUrl?: string }>;
  updateEvent(appointment: Appointment, service: Service | null): Promise<void>;
  cancelEvent(externalEventId: string): Promise<void>;
}

class LocalCalendarProvider implements CalendarProvider {
  async createEvent(appointment: Appointment, _service: Service | null): Promise<{ externalEventId: string; calendarUrl?: string }> {
    // Local provider: use the appointment ID as the "external" event ID
    // In a real provider, this would call Google/Outlook API
    return { externalEventId: appointment.id };
  }

  async updateEvent(_appointment: Appointment, _service: Service | null): Promise<void> {
    // No-op for local provider
  }

  async cancelEvent(_externalEventId: string): Promise<void> {
    // No-op for local provider
  }
}

export class CalendarService {
  private providers: Map<string, CalendarProvider> = new Map();

  constructor() {
    // Default to local provider
    this.providers.set('local', new LocalCalendarProvider());
  }

  registerProvider(name: string, provider: CalendarProvider): void {
    this.providers.set(name, provider);
  }

  getProvider(name: string = 'local'): CalendarProvider {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`Calendar provider '${name}' not registered`);
    return provider;
  }
}

export const calendarService = new CalendarService();
```

---

### Task 7: Enhanced Appointment Service

**Files:**
- Rewrite: `backend/src/services/appointment.service.ts`

The new service:
- Uses `availabilityService` for slot computation (service-specific)
- Uses `calendarService` for create/update/cancel events
- Handles reschedule chains
- Handles cancellations with reasons

```typescript
import {
  appointmentRepository,
  availabilityRepository,
  customerRepository,
  businessRepository,
} from '../repositories';
import { availabilityService } from './availability.service';
import { calendarService } from './calendar.service';
import pool from '../config/db';
import { Appointment, AppointmentStatus, Service } from '../types';

export class AppointmentService {
  async scheduleAppointment(data: {
    customerId: string;
    businessId: string;
    serviceId: string | null;
    appointmentTime: Date;
    notes?: string;
  }): Promise<Appointment> {
    const business = await businessRepository.findById(data.businessId);
    if (!business) throw new Error(`Business '${data.businessId}' not found`);

    const slotDuration = await this.getSlotDuration(data.businessId, data.serviceId);

    const isAvailable = await appointmentRepository.checkAvailability(
      data.businessId,
      data.appointmentTime,
      slotDuration
    );
    if (!isAvailable) throw new Error('The requested slot is already booked.');

    const appointment = await appointmentRepository.create(data);
    await customerRepository.updateLifecycleState(data.customerId, 'Booked');

    // Sync to calendar if configured
    const service = data.serviceId ? await this.getService(data.serviceId) : null;
    await calendarService.getProvider().createEvent(appointment, service);

    return appointment;
  }

  async rescheduleAppointment(
    appointmentId: string,
    newTime: Date,
    notes?: string
  ): Promise<Appointment> {
    const old = await appointmentRepository.findById(appointmentId);
    if (!old) throw new Error('Appointment not found');
    if (old.status === 'cancelled') throw new Error('Cannot reschedule a cancelled appointment');

    const slotDuration = await this.getSlotDuration(old.businessId, old.serviceId);

    const isAvailable = await appointmentRepository.checkAvailability(
      old.businessId,
      newTime,
      slotDuration
    );
    if (!isAvailable) throw new Error('The requested new slot is unavailable.');

    const newAppointment = await appointmentRepository.reschedule(appointmentId, newTime, 'rescheduled', notes);

    // Update calendar events
    const service = old.serviceId ? await this.getService(old.serviceId) : null;
    await calendarService.getProvider().cancelEvent(old.id);
    await calendarService.getProvider().createEvent(newAppointment, service);

    return newAppointment;
  }

  async cancelAppointment(appointmentId: string, reason?: string): Promise<void> {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) throw new Error('Appointment not found');

    await appointmentRepository.cancelWithReason(appointmentId, reason);
    await customerRepository.updateLifecycleState(appointment.customerId, 'Follow-Up Pending');

    await calendarService.getProvider().cancelEvent(appointment.id);
  }

  async confirmAppointment(appointmentId: string): Promise<void> {
    await appointmentRepository.updateStatus(appointmentId, 'confirmed');
  }

  async getAvailableSlots(
    businessId: string,
    dateStr: string,
    serviceId?: string | null
  ): Promise<{ time: string; durationMinutes: number }[]> {
    const date = new Date(dateStr + 'T00:00:00Z');
    const slotDuration = await this.getSlotDuration(businessId, serviceId);

    const windows = await availabilityService.getTimeWindows(businessId, date, serviceId);

    // If no availability schedules exist, fall back to business settings
    if (windows.length === 0) {
      return this.fallbackSlots(businessId, date, slotDuration, serviceId);
    }

    const slots: { time: string; durationMinutes: number }[] = [];

    for (const window of windows) {
      let current = new Date(window.start);
      while (current.getTime() + slotDuration * 60000 <= window.end.getTime()) {
        const isAvailable = await appointmentRepository.checkAvailability(
          businessId,
          current,
          slotDuration
        );
        if (isAvailable) {
          slots.push({
            time: current.toISOString(),
            durationMinutes: slotDuration,
          });
        }
        current = new Date(current.getTime() + slotDuration * 60000);
      }
    }

    return slots;
  }

  private async getSlotDuration(businessId: string, serviceId: string | null): Promise<number> {
    if (serviceId) {
      const service = await this.getService(serviceId);
      if (service) return service.durationMinutes;
    }
    const business = await businessRepository.findById(businessId);
    return business?.appointmentSettings?.slotDurationMinutes || 30;
  }

  private async getService(serviceId: string): Promise<Service | null> {
    const query = `SELECT * FROM services WHERE id = $1`;
    const res = await pool.query(query, [serviceId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      businessId: r.business_id,
      name: r.name,
      description: r.description,
      priceMin: Number(r.price_min),
      priceMax: Number(r.price_max),
      durationMinutes: r.duration_minutes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private async fallbackSlots(
    businessId: string,
    date: Date,
    slotDuration: number,
    _serviceId?: string | null
  ): Promise<{ time: string; durationMinutes: number }[]> {
    const business = await businessRepository.findById(businessId);
    if (!business) return [];

    const dayOfWeek = date.getDay();
    let hours = business.appointmentSettings?.workingHours?.weekday;
    if (dayOfWeek === 6) hours = business.appointmentSettings?.workingHours?.saturday;
    if (dayOfWeek === 0) hours = business.appointmentSettings?.workingHours?.sunday;
    if (!hours) return [];

    const slots: { time: string; durationMinutes: number }[] = [];
    const [sh, sm] = hours.start.split(':').map(Number);
    const [eh, em] = hours.end.split(':').map(Number);

    const current = new Date(date);
    current.setHours(sh, sm, 0, 0);
    const end = new Date(date);
    end.setHours(eh, em, 0, 0);

    while (current.getTime() + slotDuration * 60000 <= end.getTime()) {
      const isAvailable = await appointmentRepository.checkAvailability(businessId, current, slotDuration);
      if (isAvailable) {
        slots.push({ time: current.toISOString(), durationMinutes: slotDuration });
      }
      current.setMinutes(current.getMinutes() + slotDuration);
    }

    return slots;
  }
}

export const appointmentService = new AppointmentService();
```

---

### Task 8: Availability Controller

**Files:**
- Create: `backend/src/controllers/availability.controller.ts`
- Modify: `backend/src/routes/api.routes.ts`

**availability.controller.ts:**

```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import { availabilityRepository } from '../repositories';

export class AvailabilityController {
  // --- Schedules ---
  async listSchedules(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        businessId: z.string().uuid(),
        serviceId: z.string().uuid().optional(),
      });
      const parsed = schema.parse(req.query);
      const schedules = await availabilityRepository.findSchedules(parsed.businessId, parsed.serviceId);
      res.status(200).json({ success: true, data: schedules });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createSchedule(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        businessId: z.string().uuid(),
        serviceId: z.string().uuid().nullable().optional(),
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        effectiveFrom: z.string().optional(),
        effectiveUntil: z.string().nullable().optional(),
      });
      const parsed = schema.parse(req.body);
      const schedule = await availabilityRepository.createSchedule({
        ...parsed,
        effectiveFrom: parsed.effectiveFrom ? new Date(parsed.effectiveFrom) : undefined,
        effectiveUntil: parsed.effectiveUntil ? new Date(parsed.effectiveUntil) : null,
      });
      res.status(201).json({ success: true, data: schedule });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteSchedule(req: Request, res: Response): Promise<void> {
    try {
      await availabilityRepository.deleteSchedule(req.params.id);
      res.status(200).json({ success: true, message: 'Schedule deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // --- Overrides ---
  async listOverrides(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        businessId: z.string().uuid(),
        date: z.string().optional(),
      });
      const parsed = schema.parse(req.query);
      const date = parsed.date ? new Date(parsed.date) : undefined;
      const overrides = await availabilityRepository.findOverrides(parsed.businessId, date);
      res.status(200).json({ success: true, data: overrides });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createOverride(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        businessId: z.string().uuid(),
        serviceId: z.string().uuid().nullable().optional(),
        date: z.string(),
        startTime: z.string().nullable().optional(),
        endTime: z.string().nullable().optional(),
        reason: z.string().nullable().optional(),
        isAvailable: z.boolean().optional(),
      });
      const parsed = schema.parse(req.body);
      const override = await availabilityRepository.createOverride({
        ...parsed,
        date: new Date(parsed.date),
      });
      res.status(201).json({ success: true, data: override });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteOverride(req: Request, res: Response): Promise<void> {
    try {
      await availabilityRepository.deleteOverride(req.params.id);
      res.status(200).json({ success: true, message: 'Override deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const availabilityController = new AvailabilityController();
```

---

### Task 9: Enhanced Appointment Controller

**Files:**
- Modify: `backend/src/controllers/appointment.controller.ts`

Changes:
- `getSlots` — accept optional `serviceId`, return `{ time, durationMinutes }[]`
- `book` — no change needed (service already uses service-specific duration)
- `cancel` — accept `reason` in body
- Add `reschedule` method
- Add `confirm` method

Add to `AppointmentController`:

```typescript
async reschedule(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const schema = z.object({
      newTime: z.string().datetime({ message: 'newTime must be a valid ISO datetime' }),
      notes: z.string().optional(),
    });
    const parsed = schema.parse(req.body);
    const appointment = await appointmentService.rescheduleAppointment(
      id,
      new Date(parsed.newTime),
      parsed.notes
    );
    res.status(200).json({ success: true, data: appointment });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: error.message });
  }
}

async confirm(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await appointmentService.confirmAppointment(id);
    res.status(200).json({ success: true, message: 'Appointment confirmed' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

Modify `cancel` to accept reason:

```typescript
async cancel(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const schema = z.object({
      reason: z.string().optional(),
    });
    const parsed = schema.parse(req.body);
    await appointmentService.cancelAppointment(id, parsed.reason);
    res.status(200).json({ success: true, message: 'Appointment cancelled successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

Modify `getSlots` to return enhanced slots:

```typescript
async getSlots(req: Request, res: Response): Promise<void> {
  try {
    const schema = z.object({
      businessId: z.string().uuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      serviceId: z.string().uuid().optional(),
    });
    const parsed = schema.parse(req.query);
    const slots = await appointmentService.getAvailableSlots(
      parsed.businessId,
      parsed.date,
      parsed.serviceId
    );
    res.status(200).json({ success: true, data: slots });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: error.message });
  }
}
```

---

### Task 10: Routes Update

**Files:**
- Modify: `backend/src/routes/api.routes.ts`

Add imports:
```typescript
import { availabilityController } from '../controllers/availability.controller';
```

Add after the existing appointment routes (line 36):

```typescript
// Appointment Engine routes
router.post('/appointments/:id/reschedule', (req, res) => appointmentController.reschedule(req, res));
router.post('/appointments/:id/confirm', (req, res) => appointmentController.confirm(req, res));

// ==========================================
// 5. Availability Management Routes
// ==========================================
router.get('/availability/schedules', (req, res) => availabilityController.listSchedules(req, res));
router.post('/availability/schedules', (req, res) => availabilityController.createSchedule(req, res));
router.delete('/availability/schedules/:id', (req, res) => availabilityController.deleteSchedule(req, res));
router.get('/availability/overrides', (req, res) => availabilityController.listOverrides(req, res));
router.post('/availability/overrides', (req, res) => availabilityController.createOverride(req, res));
router.delete('/availability/overrides/:id', (req, res) => availabilityController.deleteOverride(req, res));
```

Rename the follow-up section from `5.` to `6.`

---

### Task 11: Frontend API Client Updates

**Files:**
- Modify: `frontend/src/lib/api.ts`

Add new functions:

```typescript
export async function cancelAppointment(
  appointmentId: string,
  reason?: string
): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_URL}/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  return response.json();
}

export async function rescheduleAppointment(
  appointmentId: string,
  newTime: string,
  notes?: string
): Promise<ApiResponse<Appointment>> {
  const response = await fetch(`${API_URL}/appointments/${appointmentId}/reschedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newTime, notes }),
  });
  return response.json();
}

export async function confirmAppointment(
  appointmentId: string
): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_URL}/appointments/${appointmentId}/confirm`, {
    method: 'POST',
  });
  return response.json();
}
```

Update `fetchAvailableSlots` to accept optional serviceId:

```typescript
export async function fetchAvailableSlots(
  businessId: string,
  date: string,
  serviceId?: string
): Promise<ApiResponse<{ time: string; durationMinutes: number }[]>> {
  let url = `${API_URL}/appointments/slots?businessId=${businessId}&date=${date}`;
  if (serviceId) url += `&serviceId=${serviceId}`;
  const response = await fetch(url);
  return response.json();
}
```

---

### Task 12: Frontend Types Sync

**Files:**
- Modify: `frontend/src/types/index.ts`

Add the same new types (with `string` for Date fields) and enhance the `Appointment` interface.

---

### Task 13: Verify TypeScript Compilation

Run: `cd backend && npx tsc --noEmit`
Expected: No compilation errors

Run: `cd frontend && npx tsc --noEmit`
Expected: No compilation errors
