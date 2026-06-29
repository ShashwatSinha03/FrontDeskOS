'use client';

import { useEffect, useState } from 'react';
import type { TourStep } from '@/lib/demo/tour/tour-definition';

interface TourToastProps {
  step: TourStep;
  onDismiss: () => void;
}

export function TourToast({ step, onDismiss }: TourToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-24 right-4 z-[90] max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-2xl transition-all duration-500 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
          {step.id.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{step.title}</p>
          <p className="mt-1 text-xs text-zinc-400">{step.description}</p>
        </div>
        <button onClick={onDismiss} className="text-zinc-500 hover:text-white">
          ✕
        </button>
      </div>
    </div>
  );
}
