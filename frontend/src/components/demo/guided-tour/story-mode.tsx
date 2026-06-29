'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDemo } from '@/lib/demo/stores/demo-provider';
import { tourSteps, type TourStep } from '@/lib/demo/tour/tour-definition';
import { TourStepCard } from './tour-step-card';
import { TourToast } from './tour-toast';

export function StoryMode() {
  const { bus } = useDemo();
  const [activeStep, setActiveStep] = useState<TourStep | null>(null);
  const [activeToast, setActiveToast] = useState<TourStep | null>(null);
  const [skipped, setSkipped] = useState(false);
  const completedRef = useRef(new Set<string>());

  useEffect(() => {
    const unsubscribers = tourSteps.map((step) =>
      bus.on(step.triggerEvent as any, () => {
        if (skipped || completedRef.current.has(step.id)) return;
        completedRef.current.add(step.id);

        if (step.type === 'modal') {
          setActiveStep(step);
        } else {
          setActiveToast(step);
        }
      })
    );

    return () => unsubscribers.forEach((u) => u());
  }, [bus, skipped]);

  const dismissCard = useCallback(() => {
    setActiveStep(null);
  }, []);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const handleSkip = useCallback(() => {
    setSkipped(true);
    setActiveStep(null);
    setActiveToast(null);
  }, []);

  return (
    <>
      {!skipped && activeStep && (
        <TourStepCard step={activeStep} onDismiss={dismissCard} onSkip={handleSkip} />
      )}
      {!skipped && activeToast && (
        <TourToast step={activeToast} onDismiss={dismissToast} />
      )}
      {!skipped && (
        <button
          onClick={handleSkip}
          className="fixed right-4 top-20 z-40 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-xs text-zinc-500 backdrop-blur-sm hover:text-white"
        >
          Skip Tour
        </button>
      )}
    </>
  );
}
