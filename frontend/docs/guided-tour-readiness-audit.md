# Guided Demo Tour — Architecture Readiness Audit

> **Audit Date:** 2026-06-28
> **Scope:** All demo engine, stores, tour system, and production pages under `src/lib/demo/`, `src/components/demo/`, and `src/app/demo/`.
> **Verdict:** ⚠️ MINOR CHANGES

---

## 1. Current Tour System Overview

### Source Files

| File | Role |
|------|------|
| `src/lib/demo/tour/tour-definition.ts` | Tour step data (4 steps: welcome, appointment_booked, escalation_triggered, lead_captured_toast) |
| `src/components/demo/guided-tour/story-mode.tsx` | React client component that subscribes to bus events, renders modals/toasts, manages skip state |
| `src/components/demo/guided-tour/tour-step-card.tsx` | Modal dialog for step with CTA button and Skip Tour |
| `src/components/demo/guided-tour/tour-toast.tsx` | Auto-dismiss (5s) toast for passive notifications |
| `src/components/demo/entry-modal.tsx` | Pre-tour entry screen ("I Understood" / "Return To Home") |

### How it Works

1. `DemoProvider` (in `demo/layout.tsx`) instantiates all stores + `DemoEventBus` and seeds synthetic data.
2. `EntryModal` shows once per session (checked via `sessionStorage`).
3. `StoryMode` subscribes to 4 bus events at mount. Each handler checks a `completedRef` Set and a `skipped` boolean — if neither is set, it displays the step as a modal or toast.
4. Steps have **no order control** — they display in whatever order their events fire. The first two (`demo_started` → "Welcome to Novura", `appointment_created` → "Appointment Booked!") happen on page load of `/demo/apex-dental` because the `ConversationEngine` emits `demo_started` on `start()` and the greeting scenario fires `appointment_created` via effects.
5. "Skip Tour" navigates to `/` and sets `skipped = true`, suppressing all future steps.

### Event-Driven Coupling (The Core Issue)

The tour is driven entirely by **business simulation events** (`DemoEventMap`). There is no dedicated tour sequence — steps piggyback on whatever order the business events happen to fire in. This means:

- The tour **cannot be replayed** (no reset mechanism for the tour system — `completedRef` is never cleared).
- The tour **cannot be paused or resumed** — it's fire-and-forget.
- Steps **cannot be reordered** independently of the business simulation.
- Steps **cannot target specific UI elements** — no `targetSelector`, `scrollTo`, `highlight`, or `tooltipPosition` fields exist in `TourStep`.

---

## 2. Phase 3 Checklist — Unsupported Features

| Feature | Status | Notes |
|---------|--------|-------|
| `order` field on steps | ❌ Missing | Steps fire in event order, not declarative order |
| `page` / route targeting | ❌ Missing | No concept of "show step X on page Y" |
| `targetSelector` / element highlight | ❌ Missing | No DOM targeting or spotlight |
| Sequential progression | ❌ Missing | All steps are independent; no `nextStepId` |
| Pause / Resume / Replay | ❌ Missing | `DemoEventBus` has no lifecycle control |
| Conditional branching | ❌ Missing | No conditions, no `showIf` / `skipIf` |
| Tooltip positioning | ❌ Missing | Always full modal or bottom-right toast |
| User analytics integration | ⚠️ Partial | `demoAnalytics.track('tour_completed')` exists but is never called |
| Step completion tracking | ⚠️ Partial | `completedRef` tracks completion per session but has no persistence |
| A/B testing / feature flags | ❌ Missing | Not applicable at this stage |

---

## 3. Tour Definition Interface Analysis

**Current `TourStep` interface** (`src/lib/demo/tour/tour-definition.ts`):

```typescript
export interface TourStep {
  id: string;
  triggerEvent: keyof DemoEventMap;  // ← the coupling point
  title: string;
  description: string;
  action?: { label: string; href: string };
  type: 'toast' | 'modal';
}
```

**Required for Production-Grade Tour:**

```typescript
export interface TourStep {
  id: string;
  order: number;                     // ← NEW: sequential ordering
  page: string;                      // ← NEW: route where step should show
  targetSelector?: string;           // ← NEW: DOM query for spotlight
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  title: string;
  description: string;
  action?: { label: string; href: string; onClick?: () => void };
  type: 'toast' | 'modal' | 'tooltip' | 'spotlight';
  nextStepId?: string;               // ← NEW: for branching
  condition?: () => boolean;         // ← NEW: conditional display
}
```

---

## 4. DemoEventBus Capabilities & Gaps

**Current** (`src/lib/demo/engine/demo-event-bus.ts`):
- Simple pub/sub with `on`, `emit`, `off`, `clear`
- Typed event map (`DemoEventMap`) with 6 business event types + `demo_started` / `demo_completed`
- No lifecycle hooks, no middleware, no async support
- No pause/resume/replay

**Gaps for Tour v2:**
- No `once()` for one-shot events
- No `emitAsync()` or promise-based progression
- No event history / replay capability
- No way to "wait for next X event" — the tour must be able to listen for a specific event and advance the tour sequence when it fires

**Recommendation:** Extend `DemoEventBus` with:
- `once()` for one-shot handlers
- A lightweight event recorder (store last N events with timestamps) to support replay
- Optional: `waitFor(event)` returning a Promise that resolves on next emission

---

## 5. Store Architecture & Reactivity

### How Stores Work
- Each store extends `DemoStore` (abstract class with `subscribe`/`notify`).
- Stores listen to the bus in their constructor and call `notify()` when they mutate.
- `useDemoStore` wraps `useSyncExternalStore` for tear-free reads.
- `DemoProvider` creates all stores in a single `useState`-equivalent (actually a fresh instantiation each render — see §7).

### Store Inventory

| Store | Bus Events Subscribed | Reactivity |
|-------|----------------------|------------|
| `AppointmentStore` | `appointment_created` | ✅ |
| `ConversationStore` | `conversation_updated`, `message_sent` | ✅ |
| `NotificationStore` | `appointment_created`, `escalation_created`, `lead_captured` | ✅ |
| `AnalyticsStore` | `appointment_created`, `lead_captured` | ✅ |
| `CostStore` | `message_sent` | ✅ |
| `DashboardStore` | `appointment_created`, `lead_captured`, `escalation_created` | ✅ |

**No store currently tracks tour state.** A `TourStore` (or tour state within an existing store) is needed.

---

## 6. Demo Provider Instantiation Pattern

**Critical Finding:** `DemoProvider` instantiates stores **per render**:

```typescript
export function DemoProvider({ children }: { children: ReactNode }) {
  const bus = new DemoEventBus();          // NEW INSTANCE EVERY RENDER
  const appointments = new AppointmentStore(bus); // NEW INSTANCE EVERY RENDER
  // ...
  seedDemoData(appointments, ...);         // RE-SEEDS EVERY RENDER
}
```

This means:
- Every re-render of `DemoProvider` destroys and recreates all stores.
- All listeners, all state, all subscriptions are lost.
- `seedDemoData()` is called on every render, potentially duplicating seed data.
- **This is a bug** — but it doesn't manifest because `DemoProvider`'s parent never re-renders it in practice (it's the top-level layout). However, any future React 18+ strict mode, Suspense, or concurrent features could trigger double-renders.

**Fix:** Use `useRef` or `useMemo` with `[]` deps to ensure stable instances:

```typescript
const bus = useRef(new DemoEventBus()).current;
const appointments = useRef(new AppointmentStore(bus)).current;
```

---

## 7. Data Flow — Page Navigation & State Persistence

**Observation:** All demo pages re-read from stores using `useDemoStore`, so state survives client-side navigation via Next.js. However, because stores are recreated on `DemoProvider` re-render, a full page refresh resets everything — including tour state.

**Current tour behavior on refresh:**
- `EntryModal` checks `sessionStorage` → dismissed if previously dismissed.
- `StoryMode` checks `skipped` (boolean state) + `completedRef` (in-memory Set) → both reset on refresh, but `demo_started` fires immediately on chat open, so user returns to step 1.

**This is acceptable** for a demo scenario — tours resetting on refresh is normal. No changes needed here.

---

## 8. Production Sidebar & Route Analysis

All demo routes examined:

| Route | File | Uses `product-card`? | Tour-relevant? |
|-------|------|---------------------|----------------|
| `/demo` | `page.tsx` | No (uses `ShimmerButton`) | Entry point |
| `/demo/apex-dental` | ApexDentalPage | Yes (FloatingChat card) | Tour starts here |
| `/demo/dashboard` | `dashboard/page.tsx` | No (uses inline `bg-zinc-900/50` classes) | Dashboard metrics |
| `/demo/dashboard/conversations` | `dashboard/conversations/page.tsx` | Yes | Conversation list |
| `/demo/dashboard/appointments` | `dashboard/appointments/page.tsx` | Yes | Appointment list |
| `/demo/dashboard/escalations` | `dashboard/escalations/page.tsx` | Yes | Escalation card |
| `/demo/dashboard/analytics` | `dashboard/analytics/page.tsx` | Yes | Analytics metrics |
| `/demo/dashboard/costs` | `dashboard/costs/page.tsx` | Yes | Cost metrics |
| `/demo/inbox` | `inbox/page.tsx` | Yes | Conversation list |
| `/demo/inbox/[conversationId]` | `inbox/[conversationId]/page.tsx` | Yes | Customer info panel |

**Notable:** Dashboard overview (`/demo/dashboard`) does NOT use `product-card`. It has inline classes `border-zinc-800 bg-zinc-900/50`. This is inconsistent with the rest of the app.

**Sidebar** (`demo-sidebar.tsx`):
- Uses inline styles for active/ inactive states, not `product-card`.
- Shows escalation badge.
- Would benefit from tour spotlight targets.

---

## 9. Async Flow & Race Conditions

### Conversation Engine Async Path
1. `FloatingChat.handleSend` → `engine.processInput(input)` (async)
2. Engine delays for `thinkingDelay` (1200ms), then transitions the scenario
3. ScenarioRunner emits effects synchronously → bus emits → stores update → React re-renders

### Tour Step Triggers
- `demo_started`: emitted synchronously in `engine.start()`
- `appointment_created`: emitted synchronously when scenario transitions to the `confirm` node
- `escalation_created`: emitted by escalation scenario effect
- `lead_captured`: emitted by... **nowhere in the current code** (the lead-capture scenario was removed from the engine; the event is only emitted by seed data if the engine runs a scenario that fires `lead_captured`)

### Race Condition Potential
- If `ConversationEngine` emits multiple events in rapid succession (e.g., a scenario transition that fires both `appointment_created` and `conversation_updated`), both tour steps could queue simultaneously.
- Currently safe because each event triggers a React state setter, and React batches synchronous state updates.
- **However**, if `story-mode.tsx` displayed steps sequentially (the goal of Phase 3), rapid-fire events could cause step overlap. A queue system would be needed.

---

## 10. Test Coverage

| Test File | Tests | What It Covers |
|-----------|-------|----------------|
| `demo-event-bus.test.ts` | 9 tests | Event lifecycle, typed payloads, unsubscribe, clear, multiple handlers |
| `conversation-engine.test.ts` | 8 tests | Start, booking flow, fallback, escalation, pricing, faq, reset |
| `appointment-store.test.ts` | 6 tests | Event-driven state, prepend, upcoming filter, notify lifecycle |

**Missing test coverage:**
- No tour system tests (`StoryMode`, `TourStepCard`, `TourToast`)
- No integration tests (bus + stores + tour)
- No `ScenarioRunner` unit tests (independently)
- No store tests for `DashboardStore`, `AnalyticsStore`, `CostStore`, `NotificationStore`, `ConversationStore`

**For Phase 3, at minimum:** Unit tests for `StoryMode` (step sequencing, skip, dismiss) and integration tests proving the bus → store → tour pipeline.

---

## 11. Component Hierarchy

```
DemoLayout (server component — no 'use client')
├── DemoProvider (creates all stores + bus)
│   ├── EntryModal (session-gated welcome)
│   ├── StoryMode (bus subscriber → renders TourStepCard / TourToast)
│   │   ├── TourStepCard (modal with ShimmerButton)
│   │   └── TourToast (auto-dismiss product-card toast)
│   └── children (page content)
│       ├── /apex-dental → ApexHero, ApexServices, FloatingChat
│       ├── /dashboard → Sidebar + page content
│       └── /inbox → Sidebar + page content
└── DemoBanner (sticky top bar)
```

**Key observation:** `StoryMode` is a sibling of page content, not a child. This means it cannot scope steps to specific pages or elements — it renders the same `Skip Tour` button regardless of which page the user is on. For Phase 3, the tour runner should be aware of which page is currently displayed.

---

## 12. Tour Step Narrative Flow (Current vs. Desired)

### Current Flow
```
User clicks "I Understood" → redirects to /demo/apex-dental
  → demo_started fires → "Welcome to Novura" modal (action: Open Chat → /demo/apex-dental)
  → User clicks Open Chat → chat opens, greeting scenario starts
  → User books appointment → appointment_created fires → "Appointment Booked!" modal (action: Open Dashboard)
  → User goes to dashboard → (nothing happens unless escalation or lead events fire)
```

### Desired Flow (Phase 3)
```
Step 1: "Welcome to Novura" → highlight chat bubble (target: #demo-chat-toggle)
Step 2: "Click 'Book an Appointment'" → highlight quick reply button
Step 3: "Select a service" → highlight service options
Step 4: "Appointment Booked!" → show modal, action → /demo/dashboard
Step 5: "View your new appointment" → highlight the appointments card on dashboard
Step 6: "Escalation" → explain the inbox, highlight sidebar Escalations item
Step 7: "Check your costs" → highlight Cost Dashboard nav item
Step 8: "Tour complete" → congratulatory modal
```

---

## 13. Specific Issues Found

### Issue 1: `DemoProvider` creates new instances on every render
- **Severity:** Medium (latent bug, not manifesting currently)
- **File:** `src/lib/demo/stores/demo-provider.tsx`
- **Fix:** Wrap instantiations in `useRef` or `useMemo([])`.

### Issue 2: `StoryMode` re-subscribes to bus on every `skipped` change
- **Severity:** Low
- **File:** `src/components/demo/guided-tour/story-mode.tsx`
- **Details:** The `useEffect` deps are `[bus, skipped]` — changing `skipped` tears down all subscriptions and re-subscribes. This is unnecessary since the handler already checks `skipped`.
- **Fix:** Remove `skipped` from deps (the handler closure captures it via the ref pattern, or use a ref for skipped).

### Issue 3: `lead_captured` event is never emitted
- **Severity:** High (the fourth tour step never shows)
- **Details:** No scenario in the engine emits `lead_captured`. The intent-matcher, scenarios, and scenario-runner have no `lead_captured` effect anywhere in the current codebase. The only place `lead_captured` appears is in `NotificationStore`'s constructor (handler for the event) and `DashboardStore` (increments on the event). But nothing ever fires it.
- **Fix:** Either add a `lead_captured` effect to one of the scenarios, or remove the `lead_captured_toast` tour step.

### Issue 4: Dashboard overview page uses inline styles instead of `product-card`
- **Severity:** Low (visual inconsistency)
- **File:** `src/app/demo/dashboard/page.tsx`
- **Fix:** Replace inline `border-zinc-800 bg-zinc-900/50` with `product-card`.

### Issue 5: No tour completion tracking
- **Severity:** Low
- **File:** `src/lib/demo/analytics/demo-analytics.ts` (event name exists but is uncalled)
- **Fix:** Call `demoAnalytics.track('tour_completed')` when all steps are completed or user explicitly finishes.

### Issue 6: `setState` in `ConversationEngine` is a no-op
- **Severity:** Low (dead code)
- **File:** `src/lib/demo/engine/conversation-engine.ts:79`
- **Details:** `private setState(_partial: Partial<ConversationState>): void {}` — empty body. `isThinking` is set in `processInput` via spread, not through this method.

---

## 14. Recommended Implementation Path (for Phase 3)

### Phase 3a — Foundation (prerequisite work)

1. **Fix Issue 1:** Stabilize `DemoProvider` instances with `useRef`.
2. **Fix Issue 3:** Either add `lead_captured` emission to a scenario or remove the dead tour step.
3. **Fix Issue 2:** Clean up `StoryMode` effect deps.
4. **Add `TourStore`:** A simple store that tracks:
   - `currentStepIndex: number`
   - `completedSteps: string[]`
   - `isActive: boolean`
   - `isPaused: boolean`
   - Methods: `advance()`, `skip()`, `reset()`, `pause()`, `resume()`

### Phase 3b — Step Sequencing
1. **Extend `TourStep` interface** with `order`, `page`, `targetSelector`, `tooltipPosition`, `nextStepId`.
2. **Rewrite `StoryMode`** as a sequential step runner that:
   - Reads steps sorted by `order`.
   - Filters steps by current page route.
   - Advances on step dismiss or action click.
   - Supports spotlight rendering (position a highlight element over `targetSelector`).
3. **Add tooltip components** (`TourTooltip` positioned relative to target, with arrow, optional spotlight overlay).
4. **Add `once` to `DemoEventBus`** for one-shot step advancement.

### Phase 3c — Integration
1. **Write integration tests** for the full tour pipeline.
2. **Add `tour_completed` analytics call**.
3. **Add "Restart Tour" option** (in sidebar or footer).
4. **Polish:** Smooth transitions, spotlight animations, keyboard dismissal.

---

## Verdict

> ## ⚠️ MINOR CHANGES
>
> The current tour system works for its narrow purpose — showing 2-3 modals in sequence as business events happen to fire. The architecture (event bus + stores + React components) is **sound and extensible**.
>
> **What's needed for Phase 3 (6-8 engineering days):**
> - 1-2 days: Foundation fixes (Issues 1-4, TourStore)
> - 2-3 days: Step sequencer + TourStep interface expansion
> - 1-2 days: Spotlight/tooltip components
> - 1 day: Integration + tests + polish
>
> **What's NOT needed:**
> - No state management library swap (stores are fine)
> - No routing overhaul (page-aware steps can use `usePathname`)
> - No backend (all tour data lives in `tour-definition.ts`)
