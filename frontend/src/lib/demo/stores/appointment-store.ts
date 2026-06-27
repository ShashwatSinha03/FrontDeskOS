import { DemoEventBus } from '../engine/demo-event-bus';
import type { Appointment } from '../engine/types';
import { DemoStore } from './store-types';

export class AppointmentStore extends DemoStore {
  appointments: Appointment[] = [];

  constructor(private bus: DemoEventBus) {
    super();
    this.bus.on('appointment_created', ({ appointment }) => {
      this.appointments = [appointment, ...this.appointments];
      this.notify();
    });
  }

  get count(): number { return this.appointments.length; }
  get upcoming(): Appointment[] { return this.appointments.filter(a => a.status === 'confirmed'); }
}
