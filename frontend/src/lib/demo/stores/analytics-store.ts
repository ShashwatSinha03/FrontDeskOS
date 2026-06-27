import { DemoEventBus } from '../engine/demo-event-bus';
import { DemoStore } from './store-types';

export interface AnalyticsMetrics {
  totalConversations: number;
  totalAppointments: number;
  totalLeads: number;
  totalEscalations: number;
  dailyVolume: { date: string; conversations: number; appointments: number }[];
  responseTimeAvg: number;
  satisfactionAvg: number;
}

export class AnalyticsStore extends DemoStore {
  metrics: AnalyticsMetrics;

  constructor(private bus: DemoEventBus) {
    super();
    this.metrics = this.getInitialMetrics();
    this.bus.on('appointment_created', () => { this.metrics.totalAppointments++; this.notify(); });
    this.bus.on('lead_captured', () => { this.metrics.totalLeads++; this.notify(); });
  }

  private getInitialMetrics(): AnalyticsMetrics {
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      return {
        date: d.toISOString().slice(0, 10),
        conversations: Math.floor(Math.random() * 20) + 5,
        appointments: Math.floor(Math.random() * 8) + 1,
      };
    });
    return {
      totalConversations: 347,
      totalAppointments: 89,
      totalLeads: 412,
      totalEscalations: 12,
      dailyVolume: days,
      responseTimeAvg: 24,
      satisfactionAvg: 94,
    };
  }
}
