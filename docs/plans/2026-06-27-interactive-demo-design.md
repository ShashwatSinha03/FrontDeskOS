# Interactive Demo Experience — Design Document

## Overview

Build a fully frontend-only interactive demo at `/demo` that showcases the complete Novura ecosystem. The demo is the primary product showcase — a self-contained, production-isolated experience that converts visitors into paying customers.

## Route

- `/demo` — Entry page with modal, demo banner layout
- `/demo/apex-dental` — Sample business website
- `/demo/dashboard/*` — Owner dashboard pages
- `/demo/inbox/*` — Inbox and conversation workspace

## Architecture

### Event-Driven Simulation

```
ConversationEngine ──emit()──→ DemoEventBus ──on()──→ Domain Stores
                      │                    ├── AppointmentStore
                      │                    ├── ConversationStore
                      │                    ├── NotificationStore
                      │                    ├── AnalyticsStore
                      │                    ├── CostStore
                      │                    └── DashboardStore
                      │
                      └──on()──→ StoryMode (separate observer)
                                  ├── toast for minor events
                                  └── modal card for major transitions
```

### DemoEventBus

Strongly typed pub/sub using a central `DemoEventMap` (TypeScript discriminated union):

```typescript
type DemoEventMap = {
  appointment_created: { service: string; date: string; time: string; customerName: string };
  lead_captured: { name: string; phone: string; source: string };
  escalation_created: { conversationId: string; reason: string };
  conversation_updated: { conversationId: string; status: string };
  message_sent: { conversationId: string; content: string; role: 'customer' | 'ai' | 'human' };
  // ...
};
```

Methods: `emit<K extends keyof DemoEventMap>(event: K, data: DemoEventMap[K])`, `on<K>(event: K, handler)`, `off(...)`.

### Domain Stores

Each store subscribes to relevant events, updates its own slice of state, and notifies React via a simple subscribe/notify pattern (or React Context with `useSyncExternalStore`):

- **AppointmentStore** — count, list, next appointment
- **ConversationStore** — active conversations, statuses, messages
- **NotificationStore** — stacked notifications with timestamps
- **AnalyticsStore** — conversation volume, conversion rate, response times
- **CostStore** — LLM costs, channel costs, monthly totals
- **DashboardStore** — aggregated overview (leads, appointments, escalations)

### Conversation Engine

Finite state machine with deterministic keyword intent matching:

- **IntentMatcher** — keyword-based (appointment → booking flow, price/cost → pricing flow, human/doctor → escalation flow, etc.)
- **ScenarioRunner** — loads scenario from static JSON/TS, walks through nodes
- Each node: `{ aiMessage, typingDelay, quickReplies[], transitions[], effects?: { emit: DemoEvent } }`

Scenarios: greeting, booking, pricing, escalation, faq, fallback.

### Entry Modal

Shown once per browser session (`sessionStorage`). Title: "Interactive Product Demo". Body explains this is simulated. Buttons: "Explore Demo", "Return Home".

### Demo Banner

Persistent subtle banner: "Demo Mode • Conversations, dashboards and AI responses are simulated."

### Sample Business Website (Apex Dental Care)

Polished multi-section page matching production quality: Hero, Services, Doctors, Testimonials, FAQ, Contact, Book Appointment, Floating AI Chat.

### Owner Dashboard

Reuses existing production UI components from `@/components/admin/`. Same pages: Overview, Conversations, Appointments, Escalations, Analytics, Deliveries, Costs, AI Performance. Data sourced from DemoState stores instead of API.

### Inbox

Reuses existing Inbox UI with scripted conversations. Owner can join/reply. Return to AI resumes automation.

### Story Mode (Guided Tour)

Separate from business simulation. Subscribes to DemoEventBus events. Shows bottom-right toasts for minor events (appointment created, lead captured). Shows centered modal cards for major story transitions ("Your appointment has been booked. Let's see how the owner receives it." → Open Dashboard). Dismissible at any time.

### Demo Analytics

Lightweight `demoAnalytics.track(event, metadata)` abstraction. Records events in memory + localStorage. Future-proof: designed to connect to GA/PostHog/Mixpanel with one adapter change. Events: Demo Started, Chat Opened, Appointment Completed, Escalation Triggered, Dashboard Viewed, Inbox Viewed, Analytics Viewed, Cost Dashboard Viewed, Tour Completed, CTA Clicked.

### Production Isolation

- Zero backend calls after initial page load
- Zero Supabase queries
- Zero AI/LLM calls
- Zero authentication
- Demo module in `lib/demo/` with no imports from production services
- All data is static/scripted JSON
- `DemoBanner` always visible

## File Structure

```
frontend/src/
  app/demo/
    page.tsx                      ← entry with modal
    layout.tsx                    ← DemoBanner wrapper
    apex-dental/page.tsx
    dashboard/
      page.tsx
      conversations/page.tsx
      appointments/page.tsx
      escalations/page.tsx
      analytics/page.tsx
      deliveries/page.tsx
      costs/page.tsx
      ai-performance/page.tsx
    inbox/
      page.tsx
      [conversationId]/page.tsx
  components/demo/
    entry-modal.tsx
    demo-banner.tsx
    apex-dental/
      hero.tsx
      services.tsx
      doctors.tsx
      testimonials.tsx
      faq.tsx
      contact.tsx
      booking-panel.tsx
      floating-chat.tsx
    conversation/
      chat-window.tsx
      typing-indicator.tsx
      quick-reply.tsx
    guided-tour/
      tour-context.tsx
      tour-step-card.tsx
      tour-toast.tsx
    dashboard/
      (thin wrappers injecting demo data into existing admin components)
  lib/demo/
    engine/
      demo-event-bus.ts
      intent-matcher.ts
      conversation-engine.ts
      scenario-runner.ts
    stores/
      appointment-store.ts
      conversation-store.ts
      notification-store.ts
      analytics-store.ts
      cost-store.ts
      dashboard-store.ts
      demo-provider.tsx
    data/
      scenarios/
        greeting.ts
        booking.ts
        pricing.ts
        escalation.ts
        faq.ts
        fallback.ts
      seed-data.ts
      conversations.ts
    analytics/
      demo-analytics.ts
    tour/
      tour-definition.ts
```

## Definition of Done

A first-time visitor can enter `/demo`, explore Apex Dental Care, chat with the AI receptionist, book an appointment, trigger an escalation, watch the dashboard update, explore inbox/analytics/costs, and complete a guided walkthrough — all without a single backend request after page load.
