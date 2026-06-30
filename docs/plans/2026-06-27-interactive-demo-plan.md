# Interactive Demo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a fully frontend-only interactive demo at `/demo` showcasing the complete Nuvora ecosystem — AI receptionist, booking, escalation, dashboard, inbox, analytics, costs.

**Architecture:** Event-driven simulation with a strongly typed DemoEventBus, domain stores (Appointments, Conversations, Notifications, Analytics, Costs, Dashboard), a keyword-based conversation engine, and a separate Story Mode that reacts to business events. All static, no backend.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, existing admin UI components

---

## Phase 1: Demo Engine Foundation

### Task 1.1: Create demo types and DemoEventMap

**Files:**
- Create: `frontend/src/lib/demo/engine/demo-event-bus.ts`
- Create: `frontend/src/lib/demo/engine/types.ts`

**Step 1: Create types.ts with all demo types**

```typescript
// lib/demo/engine/types.ts

export type ScenarioId = 'greeting' | 'booking' | 'pricing' | 'escalation' | 'faq' | 'fallback';

export type MessageRole = 'customer' | 'ai' | 'human';

export interface DemoMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

export interface ScenarioNode {
  id: string;
  aiMessage: string;
  typingDelay?: number;
  quickReplies?: string[];
  transitions?: Record<string, string>;
  effects?: DemoEffect[];
  fallback?: string;
}

export interface DemoEffect {
  type: 'appointment_created' | 'lead_captured' | 'escalation_created' | 'conversation_updated' | 'message_sent';
  payload: Record<string, unknown>;
}

export interface Scenario {
  id: ScenarioId;
  name: string;
  triggerKeywords: string[];
  nodes: Record<string, ScenarioNode>;
  entryNodeId: string;
}

export interface Appointment {
  id: string;
  service: string;
  date: string;
  time: string;
  customerName: string;
  status: 'confirmed' | 'completed' | 'cancelled';
  createdAt: number;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  source: string;
  status: 'new' | 'contacted' | 'booked' | 'lost';
  createdAt: number;
}

export interface Escalation {
  id: string;
  conversationId: string;
  reason: string;
  status: 'pending' | 'active' | 'resolved';
  createdAt: number;
}

export interface Conversation {
  id: string;
  customerName: string;
  customerPhone: string;
  status: 'active' | 'pending' | 'escalated' | 'resolved';
  messages: DemoMessage[];
  unread: number;
  escalatedAt?: number;
  channel: 'whatsapp' | 'web' | 'sms';
  createdAt: number;
}

export interface Notification {
  id: string;
  type: 'escalation' | 'appointment' | 'lead' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: number;
}

export interface CostEntry {
  id: string;
  category: 'llm' | 'whatsapp' | 'sms' | 'channel';
  description: string;
  amount: number;
  date: string;
}

export interface DashboardMetrics {
  totalConversations: number;
  activeConversations: number;
  totalAppointments: number;
  totalLeads: number;
  escalationsPending: number;
  responseTime: number;
  satisfactionRate: number;
}

export interface AnalyticsData {
  conversationVolume: { date: string; count: number }[];
  leadConversion: { date: string; leads: number; bookings: number }[];
  appointmentsByService: { service: string; count: number }[];
  responseTimes: { date: string; avgSeconds: number }[];
  satisfactionByDay: { date: string; rate: number }[];
}
```

**Step 2: Create demo-event-bus.ts with typed EventBus**

```typescript
// lib/demo/engine/demo-event-bus.ts

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
```

**Step 3: Create stores index**

Create: `frontend/src/lib/demo/stores/` directory.

### Task 1.2: Create domain stores

**Files:**
- Create: `frontend/src/lib/demo/stores/appointment-store.ts`
- Create: `frontend/src/lib/demo/stores/conversation-store.ts`
- Create: `frontend/src/lib/demo/stores/notification-store.ts`
- Create: `frontend/src/lib/demo/stores/analytics-store.ts`
- Create: `frontend/src/lib/demo/stores/cost-store.ts`
- Create: `frontend/src/lib/demo/stores/dashboard-store.ts`
- Create: `frontend/src/lib/demo/stores/store-types.ts`

**Step 1: Create store-types.ts**

```typescript
// lib/demo/stores/store-types.ts
export type Listener = () => void;

export abstract class DemoStore {
  protected listeners = new Set<Listener>();
  
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  protected notify(): void {
    this.listeners.forEach(l => l());
  }
}
```

**Step 2: Create appointment-store.ts**

```typescript
// lib/demo/stores/appointment-store.ts
import { DemoEventBus } from '../engine/demo-event-bus';
import type { Appointment } from '../engine/types';
import { DemoStore } from './store-types';

export class AppointmentStore extends DemoStore {
  appointments: Appointment[] = [];
  
  constructor(private bus: DemoEventBus) {
    super();
    this.bus.on('appointment_created', ({ appointment }) => {
      this.appointments = [appointment, ...this.appointments];
      this.notify();
    });
  }
  
  get count(): number { return this.appointments.length; }
  get upcoming(): Appointment[] { return this.appointments.filter(a => a.status === 'confirmed'); }
}
```

**Step 3: Create conversation-store.ts**

```typescript
// lib/demo/stores/conversation-store.ts
import { DemoEventBus } from '../engine/demo-event-bus';
import type { Conversation } from '../engine/types';
import { DemoStore } from './store-types';

export class ConversationStore extends DemoStore {
  conversations: Conversation[] = [];
  
  constructor(private bus: DemoEventBus) {
    super();
    this.bus.on('conversation_updated', ({ conversation }) => {
      const idx = this.conversations.findIndex(c => c.id === conversation.id);
      if (idx >= 0) this.conversations[idx] = conversation;
      else this.conversations.push(conversation);
      this.notify();
    });
    this.bus.on('message_sent', ({ conversationId, content, role }) => {
      const conv = this.conversations.find(c => c.id === conversationId);
      if (conv) {
        conv.messages.push({ id: crypto.randomUUID(), role, content, timestamp: Date.now() });
        this.notify();
      }
    });
  }
  
  getById(id: string): Conversation | undefined {
    return this.conversations.find(c => c.id === id);
  }
}
```

**Step 4: Create notification-store.ts**

```typescript
// lib/demo/stores/notification-store.ts
import { DemoEventBus } from '../engine/demo-event-bus';
import type { Notification } from '../engine/types';
import { DemoStore } from './store-types';

export class NotificationStore extends DemoStore {
  notifications: Notification[] = [];
  
  constructor(private bus: DemoEventBus) {
    super();
    this.bus.on('appointment_created', ({ appointment }) => {
      this.notifications.unshift({
        id: `notif-${Date.now()}`,
        type: 'appointment',
        title: 'New Appointment',
        message: `${appointment.customerName} booked ${appointment.service}`,
        read: false,
        createdAt: Date.now(),
      });
      this.notify();
    });
    this.bus.on('escalation_created', ({ escalation }) => {
      this.notifications.unshift({
        id: `notif-${Date.now()}`,
        type: 'escalation',
        title: 'Human Escalation',
        message: `Customer requested human assistance`,
        read: false,
        createdAt: Date.now(),
      });
      this.notify();
    });
    this.bus.on('lead_captured', ({ lead }) => {
      this.notifications.unshift({
        id: `notif-${Date.now()}`,
        type: 'lead',
        title: 'New Lead',
        message: `${lead.name} — ${lead.source}`,
        read: false,
        createdAt: Date.now(),
      });
      this.notify();
    });
  }
  
  get unread(): number { return this.notifications.filter(n => !n.read).length; }
  markRead(id: string): void { const n = this.notifications.find(x => x.id === id); if (n) { n.read = true; this.notify(); } }
}
```

**Step 5: Create analytics-store.ts**

```typescript
// lib/demo/stores/analytics-store.ts
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
      return { date: d.toISOString().slice(0, 10), conversations: Math.floor(Math.random() * 20) + 5, appointments: Math.floor(Math.random() * 8) + 1 };
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
```

**Step 6: Create cost-store.ts**

```typescript
// lib/demo/stores/cost-store.ts
import { DemoEventBus } from '../engine/demo-event-bus';
import type { CostEntry } from '../engine/types';
import { DemoStore } from './store-types';

export class CostStore extends DemoStore {
  entries: CostEntry[] = [];
  
  constructor(private bus: DemoEventBus) {
    super();
    this.entries = this.getSeedCosts();
    this.bus.on('message_sent', ({ role }) => {
      if (role === 'ai') {
        this.entries.push({ id: crypto.randomUUID(), category: 'llm', description: 'AI response', amount: 0.002, date: new Date().toISOString().slice(0, 10) });
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
```

**Step 7: Create dashboard-store.ts**

```typescript
// lib/demo/stores/dashboard-store.ts
import { DemoEventBus } from '../engine/demo-event-bus';
import { DemoStore } from './store-types';
import type { DashboardMetrics } from '../engine/types';

export class DashboardStore extends DemoStore {
  metrics: DashboardMetrics;
  
  constructor(private bus: DemoEventBus) {
    super();
    this.metrics = {
      totalConversations: 347, activeConversations: 3, totalAppointments: 89,
      totalLeads: 412, escalationsPending: 1, responseTime: 24, satisfactionRate: 94,
    };
    this.bus.on('appointment_created', () => { this.metrics.totalAppointments++; this.notify(); });
    this.bus.on('lead_captured', () => { this.metrics.totalLeads++; this.notify(); });
    this.bus.on('escalation_created', () => { this.metrics.escalationsPending++; this.notify(); });
  }
}
```

### Task 1.3: Create DemoProvider React context

**Files:**
- Create: `frontend/src/lib/demo/stores/demo-provider.tsx`

**Step 1: Create demo-provider.tsx**

```tsx
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

export function useDemoStore<T>(store: { subscribe: (l: () => void) => () => void; getSnapshot: () => T }): T {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
```

---

## Phase 2: Demo Entry + Layout

### Task 2.1: Create demo entry page with modal

**Files:**
- Create: `frontend/src/app/demo/page.tsx`
- Create: `frontend/src/app/demo/layout.tsx`
- Create: `frontend/src/components/demo/entry-modal.tsx`
- Create: `frontend/src/components/demo/demo-banner.tsx`

**Step 1: Create entry-modal.tsx**

```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export function EntryModal() {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    if (!sessionStorage.getItem('demo-modal-dismissed')) setShow(true);
  }, []);
  
  const dismiss = () => {
    sessionStorage.setItem('demo-modal-dismissed', 'true');
    setShow(false);
  };
  
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-white">Interactive Product Demo</h2>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          This experience showcases how Nuvora works using simulated conversations, dashboards and business data.
          Everything shown is scripted for demonstration purposes. No real customers, AI models or business operations are involved.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/demo/apex-dental" onClick={dismiss} className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-500">
            Explore Demo
          </Link>
          <Link href="/" onClick={dismiss} className="flex-1 rounded-lg border border-zinc-700 px-4 py-2.5 text-center text-sm font-medium text-zinc-300 hover:bg-zinc-800">
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create demo-banner.tsx**

```tsx
export function DemoBanner() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-amber-500/20 bg-amber-950/80 px-4 py-1.5 text-center text-xs text-amber-300 backdrop-blur-sm">
      Demo Mode • Conversations, dashboards and AI responses are simulated.
    </div>
  );
}
```

**Step 3: Create demo layout.tsx**

```tsx
import { DemoProvider } from '@/lib/demo/stores/demo-provider';
import { DemoBanner } from '@/components/demo/demo-banner';
import { EntryModal } from '@/components/demo/entry-modal';

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <EntryModal />
      {children}
      <DemoBanner />
    </DemoProvider>
  );
}
```

**Step 4: Create demo/page.tsx**

Simple redirect or landing that shows the modal. It can just render a basic loading state since the modal handles the flow.

### Task 2.2: Seed demo data

**Files:**
- Create: `frontend/src/lib/demo/data/seed-data.ts`
- Create: `frontend/src/lib/demo/data/conversations.ts`

**Step 1: Create seed-data.ts** — pre-populate dashboard stores with believable demo data (347 conversations, 89 appointments, 412 leads, 12 escalations, 30 days of analytics, cost entries, etc.)

**Step 2: Create conversations.ts** — 4-5 scripted conversations for the inbox:
- Sarah Johnson (active, booking enquiry)
- Mike Chen (escalated, wants to speak to doctor)
- Emily Rodriguez (resolved, completed appointment)
- David Kim (active, pricing questions)

---

## Phase 3: Conversation Engine + Scenarios

### Task 3.1: Create intent matcher

**Files:**
- Create: `frontend/src/lib/demo/engine/intent-matcher.ts`

```typescript
import type { ScenarioId } from './types';

const KEYWORD_MAP: [RegExp, ScenarioId][] = [
  [/book|appointment|schedule|reserve/, 'booking'],
  [/price|cost|how much|pricing|rate|fee|charge/, 'pricing'],
  [/human|doctor|speak|talk|real person|receptionist|call me|transfer/, 'escalation'],
  [/hour|open|close|location|address|parking|insurance|emergency|cancel/, 'faq'],
  [/hello|hi|hey|start|help|morning|evening/, 'greeting'],
];

export function matchIntent(input: string): ScenarioId | null {
  const lower = input.toLowerCase();
  for (const [regex, scenario] of KEYWORD_MAP) {
    if (regex.test(lower)) return scenario;
  }
  return null;
}
```

### Task 3.2: Create scenario data files

**Files:**
- Create: `frontend/src/lib/demo/data/scenarios/greeting.ts`
- Create: `frontend/src/lib/demo/data/scenarios/booking.ts`
- Create: `frontend/src/lib/demo/data/scenarios/pricing.ts`
- Create: `frontend/src/lib/demo/data/scenarios/escalation.ts`
- Create: `frontend/src/lib/demo/data/scenarios/faq.ts`
- Create: `frontend/src/lib/demo/data/scenarios/fallback.ts`
- Create: `frontend/src/lib/demo/data/scenarios/index.ts`

Each scenario exports a `Scenario` object with nodes:

**booking.ts example:**

```typescript
import type { Scenario } from '../../engine/types';

export const bookingScenario: Scenario = {
  id: 'booking',
  name: 'Appointment Booking',
  triggerKeywords: ['book', 'appointment', 'schedule'],
  entryNodeId: 'ask_service',
  nodes: {
    ask_service: {
      id: 'ask_service',
      aiMessage: "I'd be happy to help you book an appointment! What service are you interested in? We offer teeth whitening, routine cleaning, dental checkups, and fillings.",
      quickReplies: ['Teeth Whitening', 'Routine Cleaning', 'Dental Checkup', 'Fillings'],
      transitions: { 'Teeth Whitening': 'ask_date', 'Routine Cleaning': 'ask_date', 'Dental Checkup': 'ask_date', 'Fillings': 'ask_date' },
    },
    ask_date: {
      id: 'ask_date',
      aiMessage: 'Great choice! What day works best for you?',
      quickReplies: ['Today', 'Tomorrow', 'This Week', 'Next Week'],
      transitions: { 'Today': 'ask_time', 'Tomorrow': 'ask_time', 'This Week': 'ask_time', 'Next Week': 'ask_time' },
    },
    ask_time: {
      id: 'ask_time',
      aiMessage: 'What time would you prefer? We have availability at:',
      quickReplies: ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'],
      transitions: { '9:00 AM': 'confirm', '11:00 AM': 'confirm', '2:00 PM': 'confirm', '4:00 PM': 'confirm' },
    },
    confirm: {
      id: 'confirm',
      aiMessage: "Perfect! Your appointment has been confirmed. You'll receive a confirmation via text. Is there anything else I can help you with?",
      quickReplies: ['No, thanks!', 'Actually, I have another question'],
      effects: [{
        type: 'appointment_created',
        payload: { service: '{service}', date: '{date}', time: '{time}', customerName: 'Visitor' },
      }],
    },
  },
};
```

### Task 3.3: Create scenario runner

**Files:**
- Create: `frontend/src/lib/demo/engine/scenario-runner.ts`

```typescript
import type { Scenario, ScenarioNode, DemoMessage } from './types';
import { DemoEventBus } from './demo-event-bus';

export class ScenarioRunner {
  private currentNode: ScenarioNode | null = null;
  
  constructor(private scenario: Scenario, private bus: DemoEventBus) {}
  
  start(): { message: DemoMessage; node: ScenarioNode } {
    const node = this.scenario.nodes[this.scenario.entryNodeId];
    this.currentNode = node;
    return { message: this.createMessage(node.aiMessage), node };
  }
  
  transition(input: string): { message: DemoMessage; node: ScenarioNode } | null {
    if (!this.currentNode?.transitions) return this.fallback();
    
    // Check quick replies first
    const exactMatch = this.currentNode.quickReplies?.find(
      qr => qr.toLowerCase() === input.toLowerCase()
    );
    
    const nextId = exactMatch 
      ? this.currentNode.transitions[exactMatch]
      : this.currentNode.transitions[input] || this.matchClosest(input);
    
    if (!nextId) return this.fallback();
    
    const node = this.scenario.nodes[nextId];
    if (!node) return this.fallback();
    
    this.currentNode = node;
    
    // Execute effects
    node.effects?.forEach(effect => {
      (this.bus.emit as any)(effect.type, effect.payload);
    });
    
    return { message: this.createMessage(node.aiMessage), node };
  }
  
  private matchClosest(input: string): string | null {
    if (!this.currentNode?.quickReplies) return null;
    const lower = input.toLowerCase();
    return this.currentNode.quickReplies.find(qr => 
      qr.toLowerCase().includes(lower) || lower.includes(qr.toLowerCase())
    ) ?? null;
  }
  
  private fallback() {
    return {
      message: this.createMessage("I'm not sure I understood that. Could you please rephrase?"),
      node: this.currentNode!,
    };
  }
  
  private createMessage(content: string): DemoMessage {
    return { id: crypto.randomUUID(), role: 'ai', content, timestamp: Date.now() };
  }
}
```

### Task 3.4: Create conversation engine

**Files:**
- Create: `frontend/src/lib/demo/engine/conversation-engine.ts`

Orchestrates: IntentMatcher → ScenarioRunner for the matched scenario. Manages conversation state, typing delays, message history, and emits business events.

---

## Phase 4: Sample Business Website (Apex Dental Care)

### Task 4.1: Create Apex Dental Care page

**Files:**
- Create: `frontend/src/app/demo/apex-dental/page.tsx`
- Create: `frontend/src/components/demo/apex-dental/hero.tsx`
- Create: `frontend/src/components/demo/apex-dental/services.tsx`
- Create: `frontend/src/components/demo/apex-dental/doctors.tsx`
- Create: `frontend/src/components/demo/apex-dental/testimonials.tsx`
- Create: `frontend/src/components/demo/apex-dental/faq.tsx`
- Create: `frontend/src/components/demo/apex-dental/contact.tsx`
- Create: `frontend/src/components/demo/apex-dental/booking-panel.tsx`
- Create: `frontend/src/components/demo/apex-dental/floating-chat.tsx`

Build a polished dental clinic website matching production quality. Sections: Hero with CTA, Services grid, Doctors/staff, Testimonials carousel, FAQ accordion, Contact form (non-functional, just UI), Book Appointment button/panel that opens the chat.

The floating chat is the main interactive element — it uses the conversation engine.

### Task 4.2: Wire floating chat to conversation engine

**Files:**
- Modify: `floating-chat.tsx`
- Create: `frontend/src/components/demo/conversation/chat-window.tsx`
- Create: `frontend/src/components/demo/conversation/typing-indicator.tsx`

Floating chat button → opens chat window → uses conversation engine for responses → typing indicators on AI delays → quick reply buttons.

---

## Phase 5: Dashboard Pages

### Task 5.1: Create dashboard overview page

**Files:**
- Create: `frontend/src/app/demo/dashboard/page.tsx`

Reuse existing admin dashboard cards/UI. Inject demo data from useDemo(). Show: total conversations, active conversations, appointments, leads, escalations pending, response time, satisfaction rate.

### Task 5.2: Create dashboard sub-pages

**Files:**
- Create: `frontend/src/app/demo/dashboard/conversations/page.tsx`
- Create: `frontend/src/app/demo/dashboard/appointments/page.tsx`
- Create: `frontend/src/app/demo/dashboard/escalations/page.tsx`
- Create: `frontend/src/app/demo/dashboard/analytics/page.tsx`
- Create: `frontend/src/app/demo/dashboard/deliveries/page.tsx`
- Create: `frontend/src/app/demo/dashboard/costs/page.tsx`
- Create: `frontend/src/app/demo/dashboard/ai-performance/page.tsx`

Each page reads from DemoStore and renders using existing production UI components (or simplified versions where the production ones have too many dependencies).

### Task 5.3: Create demo sidebar/navigation

**Files:**
- Create: `frontend/src/components/demo/demo-sidebar.tsx`

Reuse/fork the existing admin sidebar with navigation to all dashboard sections. Use demo data for badges/counts (unread notifications, escalations, etc.).

---

## Phase 6: Inbox Pages

### Task 6.1: Create demo inbox list page

**Files:**
- Create: `frontend/src/app/demo/inbox/page.tsx`
- Create: `frontend/src/app/demo/inbox/layout.tsx`

Reuse existing inbox UI. List conversations from seed data. Show customer name, status, channel, last message preview, unread badge. Click to open conversation workspace.

### Task 6.2: Create demo conversation workspace

**Files:**
- Create: `frontend/src/app/demo/inbox/[conversationId]/page.tsx`

Message history, customer info sidebar, Join/Return to AI buttons. Joining sets status to active, shows owner messages. Returning to AI resumes scripted flow.

---

## Phase 7: Story Mode (Guided Tour)

### Task 7.1: Create tour infrastructure

**Files:**
- Create: `frontend/src/lib/demo/tour/tour-definition.ts`
- Create: `frontend/src/components/demo/guided-tour/tour-context.tsx`
- Create: `frontend/src/components/demo/guided-tour/tour-step-card.tsx`
- Create: `frontend/src/components/demo/guided-tour/tour-toast.tsx`

**tour-definition.ts:**

```typescript
export interface TourStep {
  id: string;
  trigger: keyof DemoEventMap;
  title: string;
  description: string;
  action?: { label: string; href: string };
  type: 'toast' | 'modal';
}

export const tourSteps: TourStep[] = [
  { id: 'welcome', trigger: 'demo_started', title: 'Welcome to Nuvora', description: 'Try booking an appointment to see how the AI receptionist works.', type: 'modal', action: { label: 'Start Chatting', href: '/demo/apex-dental' } },
  { id: 'appointment_booked', trigger: 'appointment_created', title: 'Appointment Booked!', description: "Your appointment was created instantly. Let's see how the owner receives it.", type: 'modal', action: { label: 'Open Dashboard', href: '/demo/dashboard' } },
  { id: 'escalation_triggered', trigger: 'escalation_created', title: 'Human Escalation', description: 'When something needs a human touch, it appears in the inbox.', type: 'modal', action: { label: 'Open Inbox', href: '/demo/inbox' } },
  // ...
];
```

### Task 7.2: Create StoryMode component

**Files:**
- Create: `frontend/src/components/demo/guided-tour/story-mode.tsx`

Subscribes to DemoEventBus. On each event, checks if there's a matching tour step. Shows toast or modal based on step type. Dismiss button. Skip-all button. Tracks completed steps.

---

## Phase 8: Demo Analytics

### Task 8.1: Create demo analytics abstraction

**Files:**
- Create: `frontend/src/lib/demo/analytics/demo-analytics.ts`

```typescript
type DemoEventName = 'demo_started' | 'chat_opened' | 'appointment_completed' | 'escalation_triggered' | 'dashboard_viewed' | 'inbox_viewed' | 'analytics_viewed' | 'cost_dashboard_viewed' | 'tour_completed' | 'cta_clicked';

interface DemoEvent { name: DemoEventName; metadata?: Record<string, unknown>; timestamp: number; }

class DemoAnalytics {
  private events: DemoEvent[] = [];
  
  track(name: DemoEventName, metadata?: Record<string, unknown>): void {
    const event: DemoEvent = { name, metadata, timestamp: Date.now() };
    this.events.push(event);
    try { localStorage.setItem('demo-analytics', JSON.stringify(this.events)); } catch {}
    console.log('[Demo Analytics]', name, metadata);
  }
  
  getAll(): DemoEvent[] { return [...this.events]; }
  clear(): void { this.events = []; try { localStorage.removeItem('demo-analytics'); } catch {} }
}

export const demoAnalytics = new DemoAnalytics();
```

### Task 8.2: Integrate analytics into demo

Add `demoAnalytics.track(...)` calls at all relevant entry points: entry modal (demo_started), chat open, appointment confirmed, escalation triggered, each dashboard page view, inbox page view, tour completion, CTA clicks.

---

## Phase 9: Marketing Integration + Polish

### Task 9.1: Update hero CTA

**Files:**
- Modify: `frontend/src/lib/marketing-content.ts`
- Modify: `frontend/src/components/marketing/hero.tsx`

Change "See It Live" link from `/brightsmile-dental` to `/demo`. Update the hover tooltip text.

### Task 9.2: Add CTAs to demo pages

Add "Launch Nuvora For Your Business" / "Book a Discovery Call" CTAs on demo footer/banner pointing back to real marketing funnel (Calendly).

### Task 9.3: TypeScript + build verification

Run `npx tsc --noEmit` on frontend to verify zero errors. Fix any type issues.

### Task 9.4: Write verification report

**Files:**
- Create: `docs/interactive-demo-report.md`

Document the demo architecture, production isolation verification, performance verification, and extensibility notes.

---

## Execution Order

1. Phase 1: Foundation (EventBus → Types → Stores → DemoProvider)
2. Phase 2: Entry + Layout (modal → banner → layout → route)
3. Phase 3: Engine (intent matcher → scenarios → runner → conversation engine)
4. Phase 4: Website (Apex Dental UI → floating chat integration)
5. Phase 5: Dashboard (overview → sub-pages → sidebar)
6. Phase 6: Inbox (list → workspace)
7. Phase 7: Story Mode (definitions → context → UI)
8. Phase 8: Demo Analytics (abstraction → integration)
9. Phase 9: Marketing Integration + Polish
