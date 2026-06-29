'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import type { TourStep } from '@/lib/demo/tour/tour-definition';

interface TourTooltipProps {
  step: TourStep;
  targetRect: DOMRect | null;
  onNext: () => void;
  onSkip: () => void;
  onOpenChat?: () => void;
  centered?: boolean;
}

export function TourTooltip({ step, targetRect, onNext, onSkip, centered }: TourTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');

  const [style, setStyle] = useState<React.CSSProperties | null>(null);

  const prevTargetRef = useRef<DOMRect | null>(null);
  const prevPositionRef = useRef<'bottom' | 'top'>('bottom');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSkip]);

  useEffect(() => {
    if (!targetRect || centered) return;
    const viewportH = window.innerHeight;
    const spaceBelow = viewportH - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const pos = spaceBelow > 220 ? 'bottom' : spaceAbove > 220 ? 'top' : 'bottom';
    if (pos !== prevPositionRef.current) {
      prevPositionRef.current = pos;
      setPosition(pos);
    }
  }, [targetRect, centered]);

  useEffect(() => {
    if (!targetRect || !tooltipRef.current || centered) return;
    const prev = prevTargetRef.current;
    if (prev && Math.abs(prev.top - targetRect.top) < 0.5 && Math.abs(prev.left - targetRect.left) < 0.5) return;
    prevTargetRef.current = targetRect;

    const el = tooltipRef.current;
    const tooltipHeight = el.offsetHeight;
    const tooltipWidth = el.offsetWidth;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 12;

    let top: number;
    if (position === 'bottom') {
      top = targetRect.bottom + gap;
      if (top + tooltipHeight > vh - 16) {
        top = Math.max(16, vh - tooltipHeight - 16);
      }
    } else {
      top = targetRect.top - gap - tooltipHeight;
      if (top < 16) {
        top = Math.min(targetRect.bottom + gap, vh - tooltipHeight - 16);
      }
    }

    let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    left = Math.max(16, Math.min(left, vw - tooltipWidth - 16));

    setStyle(prevStyle => {
      if (prevStyle && prevStyle.left === left && prevStyle.top === top) return prevStyle;
      return { left, top };
    });
  }, [targetRect, position, centered]);

  const handleCTA = () => {
    onNext();
  };

  if (centered) {
    return (
      <div className="fixed bottom-20 left-1/2 z-[91] -translate-x-1/2">
        <div className="w-80 product-card p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600/80 text-xs font-bold text-white">
              {step.order}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">{step.description}</p>
            </div>
          </div>
          <div className="mt-3">
            {step.autoAdvance ? (
              <p className="text-[10px] italic text-zinc-500">
                Waiting for you to complete this step...
              </p>
            ) : (
              <ShimmerButton onClick={handleCTA} className="w-full text-xs">
                {step.cta?.label || 'Continue'}
              </ShimmerButton>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!targetRect) return null;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[91]"
      style={style ?? { visibility: 'hidden' }}
    >
      <div className="w-80 product-card p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600/80 text-xs font-bold text-white">
            {step.order}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">{step.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">{step.description}</p>
          </div>
        </div>
        <div className="mt-3">
          {step.autoAdvance ? (
            <p className="text-[10px] italic text-zinc-500">
              Waiting for you to complete this step...
            </p>
          ) : (
            <ShimmerButton onClick={handleCTA} className="w-full text-xs">
              {step.cta?.label || 'Continue'}
            </ShimmerButton>
          )}
        </div>
      </div>
    </div>
  );
}
