import { DemoEventBus } from '../engine/demo-event-bus';
import type { Notification } from '../engine/types';
import { DemoStore } from './store-types';

export class NotificationStore extends DemoStore {
  notifications: Notification[] = [];

  constructor(private bus: DemoEventBus) {
    super();
    this.bus.on('appointment_created', ({ appointment }) => {
      this.notifications.unshift({
        id: `notif-${Date.now()}`,
        type: 'appointment',
        title: 'New Appointment',
        message: `${appointment.customerName} booked ${appointment.service}`,
        read: false,
        createdAt: Date.now(),
      });
      this.notify();
    });
    this.bus.on('escalation_created', () => {
      this.notifications.unshift({
        id: `notif-${Date.now()}`,
        type: 'escalation',
        title: 'Human Escalation',
        message: 'Customer requested human assistance',
        read: false,
        createdAt: Date.now(),
      });
      this.notify();
    });
    this.bus.on('lead_captured', ({ lead }) => {
      this.notifications.unshift({
        id: `notif-${Date.now()}`,
        type: 'lead',
        title: 'New Lead',
        message: `${lead.name} — ${lead.source}`,
        read: false,
        createdAt: Date.now(),
      });
      this.notify();
    });
  }

  get unread(): number { return this.notifications.filter(n => !n.read).length; }

  markRead(id: string): void {
    const n = this.notifications.find(x => x.id === id);
    if (n) { n.read = true; this.notify(); }
  }
}
