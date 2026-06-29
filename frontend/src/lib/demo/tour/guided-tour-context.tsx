'use client';

import { createContext, useContext, useMemo, useSyncExternalStore, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useDemo } from '../stores/demo-provider';
import { TourController, type TourProgress, type TourStatus } from './tour-controller';
import type { TourStep } from './tour-definition';

interface GuidedTourContextValue {
  controller: TourController;
  currentStep: TourStep | null;
  status: TourStatus;
  progress: TourProgress;
}

const GuidedTourContext = createContext<GuidedTourContextValue | null>(null);

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const { bus } = useDemo();
  const router = useRouter();

  const controller = useMemo(() => {
    const c = new TourController(bus);
    c.setRouter(router);
    c.setOnNavigate((href) => router.push(href));
    return c;
  }, [bus, router]);

  const subscribe = useCallback((l: () => void) => controller.subscribe(l), [controller]);

  const getSnapshotCurrent = useCallback(() => controller.currentStep, [controller]);
  const getSnapshotStatus = useCallback(() => controller.status, [controller]);
  const getSnapshotProgress = useCallback(() => controller.progress, [controller]);
  const ssNullValue = useMemo(() => null, []);
  const ssIdleValue = useMemo(() => 'idle' as const, []);
  const ssProgressValue = useMemo(() => ({ current: 0, total: 0 }) as const, []);
  const ssNull = useCallback(() => ssNullValue, [ssNullValue]);
  const ssIdle = useCallback(() => ssIdleValue, [ssIdleValue]);
  const ssProgress = useCallback(() => ssProgressValue, [ssProgressValue]);

  const currentStep = useSyncExternalStore(subscribe, getSnapshotCurrent, ssNull);
  const status = useSyncExternalStore(subscribe, getSnapshotStatus, ssIdle);
  const progress = useSyncExternalStore(subscribe, getSnapshotProgress, ssProgress);

  return (
    <GuidedTourContext.Provider value={{ controller, currentStep, status, progress }}>
      {children}
    </GuidedTourContext.Provider>
  );
}

export function useGuidedTour(): GuidedTourContextValue {
  const ctx = useContext(GuidedTourContext);
  if (!ctx) throw new Error('useGuidedTour must be used within GuidedTourProvider');
  return ctx;
}
