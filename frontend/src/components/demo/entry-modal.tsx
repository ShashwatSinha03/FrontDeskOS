'use client';

import { useEffect, useState } from 'react';
import { demoAnalytics } from '@/lib/demo/analytics/demo-analytics';
import { ShimmerButton } from '@/components/ui/shimmer-button';

export function EntryModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem('demo-modal-dismissed')) setShow(true);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem('demo-modal-dismissed', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 max-w-md product-card p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-white">Interactive Product Demo</h2>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          This experience showcases how Nuvora works using simulated conversations,
          dashboards and business data. Everything shown is scripted for demonstration
          purposes. No real customers, AI models or business operations are involved.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ShimmerButton
            href="/demo/apex-dental"
            onClick={() => { demoAnalytics.track('demo_started'); dismiss(); }}
            className="flex-1"
          >
            I Understood
          </ShimmerButton>
          <ShimmerButton href="/" onClick={dismiss} className="flex-1">
            Return To Home
          </ShimmerButton>
        </div>
      </div>
    </div>
  );
}
