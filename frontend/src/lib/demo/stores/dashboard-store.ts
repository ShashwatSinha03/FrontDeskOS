import { DemoEventBus } from '../engine/demo-event-bus';
import { DemoStore } from './store-types';
import type { DashboardMetrics } from '../engine/types';

export class DashboardStore extends DemoStore {
  metrics: DashboardMetrics;

  constructor(private bus: DemoEventBus) {
    super();
    this.metrics = {
      totalConversations: 347,
      activeConversations: 3,
      totalAppointments: 89,
      totalLeads: 412,
      escalationsPending: 1,
      responseTime: 24,
      satisfactionRate: 94,
    };
    this.bus.on('appointment_created', () => { this.metrics.totalAppointments++; this.notify(); });
    this.bus.on('lead_captured', () => { this.metrics.totalLeads++; this.notify(); });
    this.bus.on('escalation_created', () => { this.metrics.escalationsPending++; this.notify(); });
  }
}
