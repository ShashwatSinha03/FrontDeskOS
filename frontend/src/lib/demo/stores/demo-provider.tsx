'use client';

import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { DemoEventBus } from '../engine/demo-event-bus';
import { AppointmentStore } from './appointment-store';
import { ConversationStore } from './conversation-store';
import { NotificationStore } from './notification-store';
import { AnalyticsStore } from './analytics-store';
import { CostStore } from './cost-store';
import { DashboardStore } from './dashboard-store';

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
  const bus = new DemoEventBus();
  const appointments = new AppointmentStore(bus);
  const conversations = new ConversationStore(bus);
  const notifications = new NotificationStore(bus);
  const analytics = new AnalyticsStore(bus);
  const costs = new CostStore(bus);
  const dashboard = new DashboardStore(bus);

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
  getSnapshot: () => T
): T {
  return useSyncExternalStore((l) => store.subscribe(l), getSnapshot);
}
