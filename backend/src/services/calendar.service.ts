import { Appointment, Service } from '../types';

export interface CalendarProvider {
  createEvent(appointment: Appointment, service: Service | null): Promise<{ externalEventId: string; calendarUrl?: string }>;
  updateEvent(appointment: Appointment, service: Service | null): Promise<void>;
  cancelEvent(externalEventId: string): Promise<void>;
}

class LocalCalendarProvider implements CalendarProvider {
  async createEvent(appointment: Appointment, _service: Service | null): Promise<{ externalEventId: string; calendarUrl?: string }> {
    return { externalEventId: appointment.id };
  }

  async updateEvent(_appointment: Appointment, _service: Service | null): Promise<void> {
  }

  async cancelEvent(_externalEventId: string): Promise<void> {
  }
}

export class CalendarService {
  private providers: Map<string, CalendarProvider> = new Map();

  constructor() {
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
