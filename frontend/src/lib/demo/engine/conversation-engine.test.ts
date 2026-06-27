import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DemoEventBus } from './demo-event-bus';
import { ConversationEngine } from './conversation-engine';

beforeEach(() => {
  vi.useFakeTimers();
  if (!globalThis.crypto?.randomUUID) {
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: () => Math.random().toString(36).slice(2) },
      writable: true,
    });
  }
});

afterEach(() => {
  vi.useRealTimers();
});

async function runEngine(engine: ConversationEngine, input: string) {
  const promise = engine.processInput(input);
  await vi.advanceTimersByTimeAsync(10000);
  return promise;
}

describe('ConversationEngine', () => {
  it('should start with greeting message and quick replies', () => {
    const bus = new DemoEventBus();
    const engine = new ConversationEngine(bus);
    const state = engine.start();

    expect(state.messages).toHaveLength(2);
    expect(state.messages[0].role).toBe('customer');
    expect(state.messages[0].content).toBe('Hello!');
    expect(state.messages[1].role).toBe('ai');
    expect(state.messages[1].content).toContain('Welcome to Apex Dental Care');
    expect(state.quickReplies).toContain('Book an Appointment');
    expect(state.quickReplies).toContain('Pricing Info');
    expect(state.currentScenario).toBe('greeting');
    expect(state.isActive).toBe(true);
    expect(state.isThinking).toBe(false);
  });

  it('should emit demo_started event on start', () => {
    const bus = new DemoEventBus();
    const handler = vi.fn();
    bus.on('demo_started', handler);
    const engine = new ConversationEngine(bus);

    engine.start();

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({});
  });

  it('should route booking intent to booking scenario', async () => {
    const bus = new DemoEventBus();
    const engine = new ConversationEngine(bus);
    engine.start();

    const state = await runEngine(engine, 'book an appointment');

    const aiMessages = state.messages.filter(m => m.role === 'ai');
    const lastAi = aiMessages[aiMessages.length - 1];
    expect(lastAi.content).toContain('What service are you interested in');
    expect(state.currentScenario).toBe('booking');
    expect(state.quickReplies).toContain('Teeth Whitening');
  });

  it('should follow booking flow through to confirmation', async () => {
    const bus = new DemoEventBus();
    const handler = vi.fn();
    bus.on('appointment_created', handler);
    const engine = new ConversationEngine(bus);
    engine.start();

    let state = await runEngine(engine, 'book an appointment');
    state = await runEngine(engine, 'Teeth Whitening');
    expect(state.quickReplies).toContain('Today');

    state = await runEngine(engine, 'Today');
    expect(state.quickReplies).toContain('2:00 PM');

    state = await runEngine(engine, '2:00 PM');

    const aiMessages = state.messages.filter(m => m.role === 'ai');
    const lastAi = aiMessages[aiMessages.length - 1];
    expect(lastAi.content).toContain('confirmed');
    expect(handler).toHaveBeenCalled();
    expect(state.currentScenario).toBe('booking');
  });

  it('should fallback to fallback scenario for unknown input', async () => {
    const bus = new DemoEventBus();
    const engine = new ConversationEngine(bus);
    engine.start();

    const state = await runEngine(engine, 'asdfghjkl');

    const aiMessages = state.messages.filter(m => m.role === 'ai');
    const lastAi = aiMessages[aiMessages.length - 1];
    expect(lastAi.content).toContain('not sure I understood');
    expect(state.currentScenario).toBe('fallback');
  });

  it('should handle escalation intent', async () => {
    const bus = new DemoEventBus();
    const handler = vi.fn();
    bus.on('escalation_created', handler);
    const engine = new ConversationEngine(bus);
    engine.start();

    const state = await runEngine(engine, 'talk to a human');

    const aiMessages = state.messages.filter(m => m.role === 'ai');
    const lastAi = aiMessages[aiMessages.length - 1];
    expect(lastAi.content).toContain('transfer you to a human agent');
    expect(state.currentScenario).toBe('escalation');
    expect(handler).toHaveBeenCalled();
  });

  it('should handle pricing intent', async () => {
    const bus = new DemoEventBus();
    const engine = new ConversationEngine(bus);
    engine.start();

    const state = await runEngine(engine, 'how much do you charge');

    const aiMessages = state.messages.filter(m => m.role === 'ai');
    const lastAi = aiMessages[aiMessages.length - 1];
    expect(lastAi.content).toContain('pricing');
    expect(state.currentScenario).toBe('pricing');
  });

  it('should handle FAQ intent', async () => {
    const bus = new DemoEventBus();
    const engine = new ConversationEngine(bus);
    engine.start();

    const state = await runEngine(engine, 'what are your hours');

    expect(state.currentScenario).toBe('faq');
    const aiMessages = state.messages.filter(m => m.role === 'ai');
    const lastAi = aiMessages[aiMessages.length - 1];
    expect(lastAi.content).toContain('common questions');
  });

  it('should reset engine state', () => {
    const bus = new DemoEventBus();
    const engine = new ConversationEngine(bus);
    engine.start();
    engine.reset();

    const state = engine.start();
    expect(state.messages).toHaveLength(2);
  });
});
