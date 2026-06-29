export type DemoEventName =
  | 'demo_started'
  | 'chat_opened'
  | 'appointment_completed'
  | 'escalation_triggered'
  | 'dashboard_viewed'
  | 'inbox_viewed'
  | 'analytics_viewed'
  | 'cost_dashboard_viewed'
  | 'tour_started'
  | 'tour_completed'
  | 'tour_skipped'
  | 'tour_all_skipped'
  | 'step_viewed'
  | 'step_completed'
  | 'cta_clicked';

export interface DemoAnalyticsEvent {
  name: DemoEventName;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export type AnalyticsAdapter = {
  track: (event: DemoAnalyticsEvent) => void;
};

class DemoAnalytics {
  private events: DemoAnalyticsEvent[] = [];
  private adapter: AnalyticsAdapter | null = null;

  setAdapter(adapter: AnalyticsAdapter): void {
    this.adapter = adapter;
  }

  track(name: DemoEventName, metadata?: Record<string, unknown>): void {
    const event: DemoAnalyticsEvent = { name, metadata, timestamp: Date.now() };
    this.events.push(event);

    try {
      const stored = JSON.parse(localStorage.getItem('demo-analytics') || '[]');
      stored.push(event);
      localStorage.setItem('demo-analytics', JSON.stringify(stored.slice(-200)));
    } catch {}

    this.adapter?.track(event);
  }

  getAll(): DemoAnalyticsEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
    try { localStorage.removeItem('demo-analytics'); } catch {}
  }
}

export const demoAnalytics = new DemoAnalytics();
