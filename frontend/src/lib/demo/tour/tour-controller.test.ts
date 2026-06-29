import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DemoEventBus } from '../engine/demo-event-bus';
import { TourController } from './tour-controller';

describe('TourController', () => {
  let bus: DemoEventBus;
  let controller: TourController;

  beforeEach(() => {
    bus = new DemoEventBus();
    controller = new TourController(bus);
  });

  describe('initial state', () => {
    it('starts with idle status and null step', () => {
      expect(controller.status).toBe('idle');
      expect(controller.currentStep).toBeNull();
      expect(controller.isActive).toBe(false);
      expect(controller.isSkipped).toBe(false);
      expect(controller.isCompleted).toBe(false);
    });

    it('reports correct total progress', () => {
      expect(controller.progress.total).toBeGreaterThan(0);
      expect(controller.progress.current).toBe(0);
    });
  });

  describe('start', () => {
    it('transitions to active and shows first step', () => {
      controller.start();

      expect(controller.status).toBe('active');
      expect(controller.currentStep).not.toBeNull();
      expect(controller.currentStep!.id).toBe('welcome');
      expect(controller.progress.current).toBe(1);
    });

    it('does nothing if already started', () => {
      controller.start();
      const first = controller.currentStep;

      controller.start();

      expect(controller.currentStep).toBe(first);
    });

    it('does nothing if skipped', () => {
      controller.start();
      controller.skip();

      controller.start();

      expect(controller.isSkipped).toBe(true);
      expect(controller.currentStep).toBeNull();
    });

    it('does nothing if completed', () => {
      controller.start();
      controller.complete();

      controller.start();

      expect(controller.isCompleted).toBe(true);
    });
  });

  describe('step progression', () => {
    it('advances to next step on next() — shows null if locked by unlockEvent', () => {
      controller.start();
      const step1 = controller.currentStep;

      controller.next();

      expect(controller.currentStep!.id).toBe('book-appointment');
      expect(controller.progress.current).toBe(2);

      controller.next();

      expect(controller.currentStep).toBeNull();
      expect(controller.progress.current).toBe(3);
    });

    it('does not advance past last step — completes instead', () => {
      bus.emit('appointment_created', {
        appointment: { id: 'a1', service: 'Cleaning', date: '2026-07-01', time: '10:00', customerName: 'Test', status: 'confirmed', createdAt: Date.now() },
      });

      controller.start();
      controller.next();
      controller.next();
      controller.next();
      controller.next();
      controller.next();
      controller.next();
      controller.next();

      expect(controller.isCompleted).toBe(true);
      expect(controller.currentStep!.id).toBe('completion');
    });

    it('does not advance when skipped', () => {
      controller.start();
      controller.skip();

      controller.next();

      expect(controller.currentStep).toBeNull();
    });

    it('goes to previous step', () => {
      controller.start();
      controller.next();

      controller.previous();

      expect(controller.currentStep!.id).toBe('welcome');
      expect(controller.progress.current).toBe(1);
    });

    it('does not go before first step', () => {
      controller.start();

      controller.previous();

      expect(controller.currentStep!.id).toBe('welcome');
    });
  });

  describe('skip and restart', () => {
    it('skips the tour', () => {
      controller.start();
      controller.skip();

      expect(controller.isSkipped).toBe(true);
      expect(controller.currentStep).toBeNull();
    });

    it('restarts from the beginning after skip', () => {
      controller.start();
      controller.skip();
      controller.restart();

      expect(controller.status).toBe('active');
      expect(controller.currentStep!.id).toBe('welcome');
      expect(controller.progress.current).toBe(1);
    });

    it('restarts from beginning after completion', () => {
      controller.start();
      controller.complete();
      controller.restart();

      expect(controller.status).toBe('active');
      expect(controller.currentStep!.id).toBe('welcome');
    });
  });

  describe('completion', () => {
    it('shows completion step', () => {
      controller.start();
      controller.complete();

      expect(controller.isCompleted).toBe(true);
      expect(controller.currentStep!.id).toBe('completion');
    });
  });

  describe('event unlocking', () => {
    it('pauses step when unlock event has not fired (currentStep is null)', () => {
      controller.start();
      controller.next();

      const step2 = controller.currentStep;
      expect(step2?.id).toBe('book-appointment');

      controller.next();

      const step = controller.currentStep;
      expect(step).toBeNull();
    });

    it('advances to unlocked step when unlock event fires', () => {
      controller.start();
      controller.next();
      controller.next();

      bus.emit('appointment_created', {
        appointment: { id: 'a1', service: 'Cleaning', date: '2026-07-01', time: '10:00', customerName: 'Test', status: 'confirmed', createdAt: Date.now() },
      });

      expect(controller.currentStep).not.toBeNull();
      expect(controller.currentStep!.id).toBe('booking-complete');
    });

    it('shows step when unlock event fires before reaching it', () => {
      bus.emit('appointment_created', {
        appointment: { id: 'a1', service: 'Cleaning', date: '2026-07-01', time: '10:00', customerName: 'Test', status: 'confirmed', createdAt: Date.now() },
      });
      controller.start();
      controller.next();
      controller.next();

      const step = controller.currentStep;
      expect(step?.id).toBe('booking-complete');
    });

    it('auto-advances when current step has autoAdvance and next step unlock event fires', () => {
      controller.start();
      controller.next();

      const step2 = controller.currentStep;
      expect(step2?.id).toBe('book-appointment');
      expect(step2?.autoAdvance).toBe(true);

      bus.emit('appointment_created', {
        appointment: {
          id: 'a1', service: 'Cleaning', date: '2026-07-01',
          time: '10:00', customerName: 'Test', status: 'confirmed', createdAt: Date.now(),
        },
      });

      const step3 = controller.currentStep;
      expect(step3?.id).toBe('booking-complete');
      expect(step3?.order).toBe(3);
    });

    it('tracks fired events via hasEventFired', () => {
      expect(controller.hasEventFired('appointment_created')).toBe(false);

      bus.emit('appointment_created', {
        appointment: { id: 'a1', service: 'Cleaning', date: '2026-07-01', time: '10:00', customerName: 'Test', status: 'confirmed', createdAt: Date.now() },
      });

      expect(controller.hasEventFired('appointment_created')).toBe(true);
    });
  });

  describe('CTAs and navigation', () => {
    it('handles CTA click with href via onNavigate callback', () => {
      const onNavigate = vi.fn();
      controller.setOnNavigate(onNavigate);

      controller.start();
      const step = controller.currentStep!;
      controller.handleCTAClick(step);

      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('handles CTA click with href', () => {
      const onNavigate = vi.fn();
      controller.setOnNavigate(onNavigate);

      const step3 = {
        id: 'test', order: 3, page: '/test', title: 'Test', description: '',
        type: 'modal' as const,
        cta: { label: 'Go', href: '/test-page' },
      };
      controller.handleCTAClick(step3);

      expect(onNavigate).toHaveBeenCalledWith('/test-page');
    });

    it('handles CTA click with onClick callback', () => {
      const onClick = vi.fn();

      const step = {
        id: 'test', order: 1, page: '/test', title: 'Test', description: '',
        type: 'modal' as const,
        cta: { label: 'Do', onClick },
      };
      controller.handleCTAClick(step);

      expect(onClick).toHaveBeenCalledOnce();
    });
  });

  describe('subscribe/notify', () => {
    it('notifies listeners on state change', () => {
      const listener = vi.fn();
      controller.subscribe(listener);

      controller.start();

      expect(listener).toHaveBeenCalled();
    });

    it('stops notifying after unsubscribe', () => {
      const listener = vi.fn();
      const unsub = controller.subscribe(listener);
      unsub();

      controller.start();

      expect(listener).not.toHaveBeenCalled();
    });

    it('notifies on skip', () => {
      const listener = vi.fn();
      controller.subscribe(listener);
      controller.start();
      listener.mockClear();

      controller.skip();

      expect(listener).toHaveBeenCalled();
    });

    it('notifies on complete', () => {
      const listener = vi.fn();
      controller.subscribe(listener);
      controller.start();
      listener.mockClear();

      controller.complete();

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('open chat callback', () => {
    it('calls onOpenChat when handleOpenChat is invoked', () => {
      const onOpenChat = vi.fn();
      controller.setOnOpenChat(onOpenChat);

      controller.handleOpenChat();

      expect(onOpenChat).toHaveBeenCalledOnce();
    });
  });
});
