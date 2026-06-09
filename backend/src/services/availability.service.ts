import { availabilityRepository } from '../repositories';

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

    const schedules = await availabilityRepository.findSchedulesByDay(businessId, dayOfWeek, serviceId);

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

    const windows: TimeWindow[] = effectiveSchedules.map(s => {
      const start = new Date(date);
      const [sh, sm] = s.startTime.split(':').map(Number);
      start.setHours(sh, sm, 0, 0);

      const end = new Date(date);
      const [eh, em] = s.endTime.split(':').map(Number);
      end.setHours(eh, em, 0, 0);

      return { start, end };
    });

    const overrides = await availabilityRepository.findOverrides(businessId, date);

    for (const override of overrides) {
      if (!override.isAvailable) {
        const blockStart = new Date(date);
        const [bsh, bsm] = (override.startTime || '00:00').split(':').map(Number);
        blockStart.setHours(bsh, bsm, 0, 0);

        const blockEnd = new Date(date);
        const [beh, bem] = (override.endTime || '23:59').split(':').map(Number);
        blockEnd.setHours(beh, bem, 0, 0);

        this.removeOverlap(windows, blockStart, blockEnd);
      } else if (override.startTime && override.endTime) {
        const customStart = new Date(date);
        const [csh, csm] = override.startTime.split(':').map(Number);
        customStart.setHours(csh, csm, 0, 0);

        const customEnd = new Date(date);
        const [ceh, cem] = override.endTime.split(':').map(Number);
        customEnd.setHours(ceh, cem, 0, 0);

        windows.push({ start: customStart, end: customEnd });
      }
    }

    return this.mergeWindows(windows);
  }

  private removeOverlap(windows: TimeWindow[], blockStart: Date, blockEnd: Date): void {
    for (let i = windows.length - 1; i >= 0; i--) {
      const w = windows[i];
      if (w.end <= blockStart || w.start >= blockEnd) continue;

      if (w.start >= blockStart && w.end <= blockEnd) {
        windows.splice(i, 1);
        continue;
      }

      if (w.start < blockStart && w.end > blockEnd) {
        windows.splice(i, 1,
          { start: w.start, end: blockStart },
          { start: blockEnd, end: w.end }
        );
        continue;
      }

      if (w.start < blockStart) {
        windows[i] = { start: w.start, end: blockStart };
        continue;
      }

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
