import { DemoEventBus } from '../engine/demo-event-bus';
import type { CostEntry } from '../engine/types';
import { DemoStore } from './store-types';

export class CostStore extends DemoStore {
  entries: CostEntry[];

  constructor(private bus: DemoEventBus) {
    super();
    this.entries = this.getSeedCosts();
    this.bus.on('message_sent', ({ role }) => {
      if (role === 'ai') {
        this.entries.push({
          id: crypto.randomUUID(),
          category: 'llm',
          description: 'AI response',
          amount: 0.002,
          date: new Date().toISOString().slice(0, 10),
        });
        this.notify();
      }
    });
  }

  private getSeedCosts(): CostEntry[] {
    const entries: CostEntry[] = [];
    for (let i = 0; i < 60; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      entries.push({ id: `cost-${i}`, category: 'llm', description: 'AI conversations', amount: 0.15 + Math.random() * 0.3, date: d.toISOString().slice(0, 10) });
    }
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      entries.push({ id: `wa-${i}`, category: 'whatsapp', description: 'WhatsApp messages', amount: 0.05 + Math.random() * 0.1, date: d.toISOString().slice(0, 10) });
    }
    return entries;
  }

  get totalCost(): number { return this.entries.reduce((s, e) => s + e.amount, 0); }
  get llmCost(): number { return this.entries.filter(e => e.category === 'llm').reduce((s, e) => s + e.amount, 0); }
  get channelCost(): number { return this.entries.filter(e => e.category !== 'llm').reduce((s, e) => s + e.amount, 0); }
}
