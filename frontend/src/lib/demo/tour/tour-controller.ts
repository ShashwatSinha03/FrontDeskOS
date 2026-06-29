import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { DemoEventBus } from '../engine/demo-event-bus';
import { tourSteps, completionStep, type TourStep } from './tour-definition';
import { demoAnalytics } from '../analytics/demo-analytics';

export type TourStatus = 'idle' | 'active' | 'skipped' | 'completed';

export interface TourProgress {
  current: number;
  total: number;
}

type Listener = () => void;

export class TourController {
  private bus: DemoEventBus;
  private router: AppRouterInstance | null = null;
  private _status: TourStatus = 'idle';
  private _currentStep: TourStep | null = null;
  private _progress: TourProgress = { current: 0, total: tourSteps.length };
  private _stepIndex = 0;
  private _firedEvents = new Set<string>();
  private _completedStepIds = new Set<string>();
  private listeners = new Set<Listener>();
  private unsubBus: (() => void)[] = [];
  private _onNavigate: ((href: string) => void) | null = null;
  private _onOpenChat: (() => void) | null = null;

  constructor(bus: DemoEventBus) {
    this.bus = bus;
    const allEvents = new Set(tourSteps.map(s => s.unlockEvent).filter(Boolean));
    allEvents.forEach(event => {
      const unsub = this.bus.on(event as any, () => {
        this._firedEvents.add(event as string);
        const waiting = this._currentStep?.unlockEvent === event;
        const autoAdvanceNext = this._currentStep?.autoAdvance &&
          this._stepIndex + 1 < tourSteps.length &&
          tourSteps[this._stepIndex + 1].unlockEvent === event;
        if (waiting || autoAdvanceNext || (!this._currentStep && this._status === 'active')) {
          this.advance();
        }
        this.notify();
      });
      this.unsubBus.push(unsub);
    });
  }

  setRouter(router: AppRouterInstance) {
    this.router = router;
  }

  setOnNavigate(fn: (href: string) => void) {
    this._onNavigate = fn;
  }

  setOnOpenChat(fn: () => void) {
    this._onOpenChat = fn;
  }

  get status() { return this._status; }
  get currentStep() { return this._currentStep; }
  get progress() { return this._progress; }
  get isSkipped() { return this._status === 'skipped'; }
  get isCompleted() { return this._status === 'completed'; }
  get isActive() { return this._status === 'active'; }

  hasEventFired(event: string): boolean {
    return this._firedEvents.has(event);
  }

  start(): void {
    if (this._status !== 'idle') return;
    this._status = 'active';
    this._stepIndex = 0;
    this._currentStep = null;
    demoAnalytics.track('tour_started');
    this.advance();
  }

  next(): void {
    if (this._status !== 'active') return;
    if (this._currentStep) {
      demoAnalytics.track('step_completed', { stepId: this._currentStep.id });
      this._completedStepIds.add(this._currentStep.id);
    }
    this.advance();
  }

  previous(): void {
    if (this._status !== 'active' || this._stepIndex <= 0) return;
    const prevId = tourSteps[this._stepIndex - 1]?.id;
    if (prevId) {
      this._completedStepIds.delete(prevId);
    }
    this._stepIndex = Math.max(0, this._stepIndex - 1);
    this._currentStep = null;
    this.advance();
  }

  skip(): void {
    this._status = 'skipped';
    this._currentStep = null;
    demoAnalytics.track('tour_skipped');
    this.cleanup();
    this.notify();
  }

  skipAll(): void {
    this._status = 'completed';
    this._currentStep = null;
    this._completedStepIds.clear();
    sessionStorage.setItem('tour-perma-skipped', 'true');
    demoAnalytics.track('tour_all_skipped');
    this.cleanup();
    this.notify();
  }

  restart(): void {
    this.cleanup();
    this._status = 'idle';
    this._stepIndex = 0;
    this._currentStep = null;
    this._completedStepIds.clear();
    this.start();
  }

  complete(): void {
    this._currentStep = completionStep;
    this._status = 'completed';
    demoAnalytics.track('tour_completed');
    this.notify();
  }

  handleCTAClick(step: TourStep): void {
    demoAnalytics.track('cta_clicked', { stepId: step.id, label: step.cta?.label });
    if (step.cta?.onClick) {
      step.cta.onClick();
    } else if (step.cta?.href) {
      this.navigateTo(step.cta.href);
    }
  }

  handleOpenChat(): void {
    this._onOpenChat?.();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    this.cleanup();
    this.listeners.clear();
  }

  private advance(): void {
    if (this._status !== 'active') return;

    while (this._stepIndex < tourSteps.length) {
      const step = tourSteps[this._stepIndex];

      if (this._completedStepIds.has(step.id)) {
        this._stepIndex++;
        continue;
      }

      if (this._currentStep && this._currentStep.id === step.id) {
        this._completedStepIds.add(step.id);
        this._stepIndex++;
        continue;
      }

      if (step.unlockEvent && !this._firedEvents.has(step.unlockEvent)) {
        this._progress = { current: this._stepIndex + 1, total: tourSteps.length };
        this._currentStep = null;
        this.notify();
        return;
      }

      this._currentStep = step;
      this._progress = { current: this._stepIndex + 1, total: tourSteps.length };
      demoAnalytics.track('step_viewed', { stepId: step.id, step: this._stepIndex + 1 });
      this.notify();
      return;
    }

    this.complete();
  }

  private navigateTo(href: string): void {
    if (this._onNavigate) {
      this._onNavigate(href);
    } else if (this.router) {
      this.router.push(href);
    }
  }

  private cleanup(): void {
    this._currentStep = null;
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }
}
