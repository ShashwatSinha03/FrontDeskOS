'use client';

import Link from 'next/link';
import type { TourStep } from '@/lib/demo/tour/tour-definition';

interface TourStepCardProps {
  step: TourStep;
  onDismiss: () => void;
  onSkip: () => void;
}

export function TourStepCard({ step, onDismiss, onSkip }: TourStepCardProps) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
            {step.id.charAt(0).toUpperCase()}
          </div>
          <h3 className="text-lg font-semibold text-white">{step.title}</h3>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">{step.description}</p>
        <div className="mt-6 flex items-center gap-3">
          {step.action ? (
            <Link
              href={step.action.href}
              onClick={onDismiss}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-500"
            >
              {step.action.label}
            </Link>
          ) : (
            <button
              onClick={onDismiss}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Got it
            </button>
          )}
          <button onClick={onSkip} className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800">
            Skip Tour
          </button>
        </div>
      </div>
    </div>
  );
}
