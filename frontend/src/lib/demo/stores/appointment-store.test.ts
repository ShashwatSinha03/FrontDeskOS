import { describe, it, expect, vi } from 'vitest';
import { DemoEventBus } from '../engine/demo-event-bus';
import { AppointmentStore } from './appointment-store';

describe('AppointmentStore', () => {
  it('should start with zero appointments', () => {
    const bus = new DemoEventBus();
    const store = new AppointmentStore(bus);
    expect(store.appointments).toHaveLength(0);
    expect(store.count).toBe(0);
  });

  it('should add appointment on appointment_created event', () => {
    const bus = new DemoEventBus();
    const store = new AppointmentStore(bus);

    const appointment = {
      id: 'a1',
      service: 'Consultation',
      date: '2025-06-01',
      time: '10:00',
      customerName: 'Alice',
      status: 'confirmed' as const,
      createdAt: Date.now(),
    };

    bus.emit('appointment_created', { appointment });

    expect(store.appointments).toHaveLength(1);
    expect(store.appointments[0]).toBe(appointment);
    expect(store.count).toBe(1);
  });

  it('should prepend new appointments', () => {
    const bus = new DemoEventBus();
    const store = new AppointmentStore(bus);

    const app1 = { id: 'a1', service: 'A', date: '', time: '', customerName: 'Alice', status: 'confirmed' as const, createdAt: 1 };
    const app2 = { id: 'a2', service: 'B', date: '', time: '', customerName: 'Bob', status: 'confirmed' as const, createdAt: 2 };

    bus.emit('appointment_created', { appointment: app1 });
    bus.emit('appointment_created', { appointment: app2 });

    expect(store.appointments[0]).toBe(app2);
    expect(store.appointments[1]).toBe(app1);
  });

  it('should return only confirmed appointments from upcoming', () => {
    const bus = new DemoEventBus();
    const store = new AppointmentStore(bus);

    bus.emit('appointment_created', { appointment: { id: 'a1', service: 'A', date: '', time: '', customerName: 'Alice', status: 'confirmed' as const, createdAt: 1 } });
    bus.emit('appointment_created', { appointment: { id: 'a2', service: 'B', date: '', time: '', customerName: 'Bob', status: 'completed' as const, createdAt: 2 } });
    bus.emit('appointment_created', { appointment: { id: 'a3', service: 'C', date: '', time: '', customerName: 'Charlie', status: 'cancelled' as const, createdAt: 3 } });

    expect(store.upcoming).toHaveLength(1);
    expect(store.upcoming[0].id).toBe('a1');
  });

  it('should notify listeners on event', () => {
    const bus = new DemoEventBus();
    const store = new AppointmentStore(bus);
    const listener = vi.fn();
    store.subscribe(listener);

    bus.emit('appointment_created', { appointment: { id: 'a1', service: 'A', date: '', time: '', customerName: 'Alice', status: 'confirmed' as const, createdAt: 1 } });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should not notify after unsubscribe', () => {
    const bus = new DemoEventBus();
    const store = new AppointmentStore(bus);
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    unsub();

    bus.emit('appointment_created', { appointment: { id: 'a1', service: 'A', date: '', time: '', customerName: 'Alice', status: 'confirmed' as const, createdAt: 1 } });

    expect(listener).not.toHaveBeenCalled();
  });
});
