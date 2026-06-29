'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useGuidedTour } from '@/lib/demo/tour/guided-tour-context';
import { Spotlight } from './spotlight';
import { TourStepModal } from './tour-step-modal';
import { TourTooltip } from './tour-tooltip';
import { TourProgress } from './tour-progress';
import { demoAnalytics } from '@/lib/demo/analytics/demo-analytics';

export function TourOverlay() {
  const { controller, currentStep, status, progress } = useGuidedTour();
  const pathname = usePathname();
  const router = useRouter();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const handleSkip = useCallback(() => {
    demoAnalytics.track('tour_skipped', { stepId: currentStep?.id });
    controller.skip();
  }, [controller, currentStep]);

  const handleEndTour = useCallback(() => {
    demoAnalytics.track('tour_skipped', { stepId: currentStep?.id });
    controller.skip();
    router.push('/');
  }, [controller, currentStep, router]);

  const handleSkipTour = useCallback(() => {
    controller.skipAll();
  }, [controller]);

  const handleNext = useCallback(() => {
    if (!currentStep) return;
    demoAnalytics.track('step_completed', { stepId: currentStep.id });

    if (currentStep.cta?.href) {
      controller.handleCTAClick(currentStep);
    }

    if (currentStep.id === 'welcome') {
      controller.handleOpenChat();
    }

    if (currentStep.nextStep === 'completion') {
      controller.complete();
      return;
    }

    controller.next();
  }, [controller, currentStep]);

  const handleOpenChat = useCallback(() => {
    const chatToggle = document.querySelector('[data-tour="tour-chat-widget"]') as HTMLElement;
    chatToggle?.click();
  }, []);

  const handlePosition = useCallback((r: DOMRect | null) => {
    setTargetRect(r || null);
  }, []);

  useEffect(() => {
    controller.setOnOpenChat(handleOpenChat);
  }, [controller, handleOpenChat]);

  if (status !== 'active' || !currentStep) {
    return null;
  }

  if (currentStep.page && currentStep.page !== pathname) {
    return null;
  }

  return (
    <>
      {currentStep.type === 'modal' && (
        <TourStepModal
          step={currentStep}
          onNext={handleNext}
          onSkip={handleSkip}
          onOpenChat={handleOpenChat}
        />
      )}

      {currentStep.type === 'tooltip' && currentStep.target && (currentStep.id === 'welcome' || currentStep.id === 'book-appointment') ? (
        <>
          <Spotlight target={currentStep.target} padding={8} onPosition={handlePosition} />
          <TourTooltip
            step={currentStep}
            targetRect={targetRect}
            onNext={handleNext}
            onSkip={handleSkip}
            onOpenChat={handleOpenChat}
            centered
          />
        </>
      ) : currentStep.type === 'tooltip' && currentStep.target && (
        <Spotlight
          target={currentStep.target}
          padding={8}
          onPosition={handlePosition}
        >
          <TourTooltip
            step={currentStep}
            targetRect={targetRect}
            onNext={handleNext}
            onSkip={handleSkip}
            onOpenChat={handleOpenChat}
          />
        </Spotlight>
      )}

      {currentStep.type === 'spotlight' && currentStep.target && (
        <Spotlight target={currentStep.target} padding={12}>
          <div className="w-80 product-card p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600/80 text-xs font-bold text-white">
                {currentStep.order}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{currentStep.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  {currentStep.description}
                </p>
              </div>
            </div>
            <button
              onClick={handleNext}
              className="mt-4 w-full rounded-lg bg-blue-600/80 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500/80"
            >
              {currentStep.cta?.label || 'Continue'}
            </button>
          </div>
        </Spotlight>
      )}

      <div className="fixed bottom-4 left-1/2 z-[95] -translate-x-1/2 max-w-[calc(100vw-2rem)]">
        <div className="product-card px-4 py-2 backdrop-blur-sm">
          <TourProgress current={progress.current} total={progress.total} />
        </div>
      </div>

      <div className="!fixed right-4 top-4 z-[100] flex items-center gap-2">
        <button
          onClick={handleSkipTour}
          className="product-card border-zinc-700/50 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
        >
          Skip Tour
        </button>
        <button
          onClick={handleEndTour}
          className="product-card border-zinc-700/50 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
        >
          End Demo →
        </button>
      </div>
    </>
  );
}
