import { describe, it, expect, vi } from 'vitest';
import { DemoEventBus } from './demo-event-bus';

describe('DemoEventBus', () => {
  it('should emit and receive events', () => {
    const bus = new DemoEventBus();
    const handler = vi.fn();
    bus.on('demo_started', handler);
    bus.emit('demo_started', {});
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({});
  });

  it('should pass typed payload to handler', () => {
    const bus = new DemoEventBus();
    const handler = vi.fn();
    bus.on('appointment_created', handler);
    const appointment = {
      id: '1',
      service: 'Consultation',
      date: '2025-01-01',
      time: '10:00',
      customerName: 'Alice',
      status: 'confirmed' as const,
      createdAt: 1000,
    };
    bus.emit('appointment_created', { appointment });
    expect(handler).toHaveBeenCalledWith({ appointment });
  });

  it('should support unsubscribe via returned function', () => {
    const bus = new DemoEventBus();
    const handler = vi.fn();
    const unsub = bus.on('demo_completed', handler);
    unsub();
    bus.emit('demo_completed', {});
    expect(handler).not.toHaveBeenCalled();
  });

  it('should support off() to remove handler', () => {
    const bus = new DemoEventBus();
    const handler = vi.fn();
    bus.on('lead_captured', handler);
    bus.off('lead_captured', handler);
    bus.emit('lead_captured', { lead: { id: '1', name: 'Bob', phone: '123', source: 'web', status: 'new', createdAt: 1000 } });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should support clear() to remove all handlers', () => {
    const bus = new DemoEventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    bus.on('demo_started', handler1);
    bus.on('demo_completed', handler2);
    bus.clear();
    bus.emit('demo_started', {});
    bus.emit('demo_completed', {});
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it('should support multiple handlers for same event', () => {
    const bus = new DemoEventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    bus.on('message_sent', handler1);
    bus.on('message_sent', handler2);
    bus.emit('message_sent', { conversationId: 'c1', content: 'hello', role: 'customer' });
    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
  });

  it('should not throw when emitting event with no handlers', () => {
    const bus = new DemoEventBus();
    expect(() => bus.emit('demo_started', {})).not.toThrow();
  });

  it('should not throw when removing handler that was never registered', () => {
    const bus = new DemoEventBus();
    const handler = vi.fn();
    expect(() => bus.off('demo_started', handler)).not.toThrow();
  });

  it('should not call handler after off()', () => {
    const bus = new DemoEventBus();
    const handler = vi.fn();
    bus.on('escalation_created', handler);
    bus.emit('escalation_created', { escalation: { id: '1', conversationId: 'c1', reason: 'test', status: 'pending', createdAt: 1000 } });
    expect(handler).toHaveBeenCalledOnce();
    bus.off('escalation_created', handler);
    bus.emit('escalation_created', { escalation: { id: '2', conversationId: 'c2', reason: 'test2', status: 'active', createdAt: 2000 } });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('should handle conversation_updated event', () => {
    const bus = new DemoEventBus();
    const handler = vi.fn();
    bus.on('conversation_updated', handler);
    const conversation = {
      id: 'c1',
      customerName: 'Alice',
      customerPhone: '123',
      status: 'active' as const,
      messages: [],
      unread: 1,
      channel: 'whatsapp' as const,
      createdAt: 1000,
    };
    bus.emit('conversation_updated', { conversation });
    expect(handler).toHaveBeenCalledWith({ conversation });
  });
});
