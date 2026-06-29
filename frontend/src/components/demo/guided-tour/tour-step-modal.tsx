'use client';

import { useEffect, useRef } from 'react';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import type { TourStep } from '@/lib/demo/tour/tour-definition';

interface TourStepModalProps {
  step: TourStep;
  onNext: () => void;
  onSkip: () => void;
  onOpenChat?: () => void;
}

export function TourStepModal({ step, onNext, onSkip, onOpenChat }: TourStepModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSkip]);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => prev?.focus();
  }, []);

  const handleCTA = () => {
    if (step.cta?.onClick) {
      step.cta.onClick();
    } else if (step.cta?.href) {
      onNext();
    } else {
      onNext();
    }
  };

  const ctaLabel = step.cta?.label || 'Continue';

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="mx-4 max-w-md product-card p-6 shadow-2xl outline-none"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/80 text-sm font-bold text-white">
            {step.order}
          </div>
          <h3 className="text-lg font-semibold text-white">{step.title}</h3>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">{step.description}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <ShimmerButton onClick={handleCTA} className="flex-1">
            {ctaLabel}
          </ShimmerButton>
          {step.cta?.secondary && (
            <ShimmerButton
              onClick={() => {
                if (step.cta?.secondary?.href) {
                  window.location.href = step.cta.secondary.href;
                }
              }}
              className="flex-1"
            >
              {step.cta.secondary.label}
            </ShimmerButton>
          )}
        </div>
      </div>
    </div>
  );
}
