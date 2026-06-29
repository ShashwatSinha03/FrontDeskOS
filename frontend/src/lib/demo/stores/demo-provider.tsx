'use client';

import { createContext, useContext, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { DemoEventBus } from '../engine/demo-event-bus';
import { AppointmentStore } from './appointment-store';
import { ConversationStore } from './conversation-store';
import { NotificationStore } from './notification-store';
import { AnalyticsStore } from './analytics-store';
import { CostStore } from './cost-store';
import { DashboardStore } from './dashboard-store';
import { seedDemoData } from '../data/seed-data';

interface DemoContextValue {
  bus: DemoEventBus;
  appointments: AppointmentStore;
  conversations: ConversationStore;
  notifications: NotificationStore;
  analytics: AnalyticsStore;
  costs: CostStore;
  dashboard: DashboardStore;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const bus = useMemo(() => new DemoEventBus(), []);
  const appointments = useMemo(() => new AppointmentStore(bus), [bus]);
  const conversations = useMemo(() => new ConversationStore(bus), [bus]);
  const notifications = useMemo(() => new NotificationStore(bus), [bus]);
  const analytics = useMemo(() => new AnalyticsStore(bus), [bus]);
  const costs = useMemo(() => new CostStore(bus), [bus]);
  const dashboard = useMemo(() => new DashboardStore(bus), [bus]);

  const seeded = useRef(false);
  if (!seeded.current) {
    seedDemoData(appointments, conversations, notifications, analytics, costs, dashboard);
    seeded.current = true;
  }

  return (
    <DemoContext.Provider value={{ bus, appointments, conversations, notifications, analytics, costs, dashboard }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
}

export function useDemoStore<T>(
  store: { subscribe: (l: () => void) => () => void },
  getSnapshot: () => T,
  getServerSnapshot?: () => T
): T {
  return useSyncExternalStore(
    (l) => store.subscribe(l),
    getSnapshot,
    getServerSnapshot ?? getSnapshot
  );
}
