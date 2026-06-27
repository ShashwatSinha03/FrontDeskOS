import type { Appointment, Lead, Escalation, Conversation } from './types';

export interface DemoEventMap {
  appointment_created: { appointment: Appointment };
  lead_captured: { lead: Lead };
  escalation_created: { escalation: Escalation };
  conversation_updated: { conversation: Conversation };
  message_sent: { conversationId: string; content: string; role: 'customer' | 'ai' | 'human' };
  demo_started: {};
  demo_completed: {};
}

type Handler<K extends keyof DemoEventMap> = (data: DemoEventMap[K]) => void;

export class DemoEventBus {
  private handlers = new Map<string, Set<Handler<any>>>();

  on<K extends keyof DemoEventMap>(event: K, handler: Handler<K>): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  emit<K extends keyof DemoEventMap>(event: K, data: DemoEventMap[K]): void {
    this.handlers.get(event)?.forEach(h => h(data));
  }

  off<K extends keyof DemoEventMap>(event: K, handler: Handler<K>): void {
    this.handlers.get(event)?.delete(handler);
  }

  clear(): void {
    this.handlers.clear();
  }
}
