'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
      <div className="mx-4 max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-white">Interactive Product Demo</h2>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          This experience showcases how Novura works using simulated conversations,
          dashboards and business data. Everything shown is scripted for demonstration
          purposes. No real customers, AI models or business operations are involved.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/demo/apex-dental"
            onClick={dismiss}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-500"
          >
            Explore Demo
          </Link>
          <Link
            href="/"
            onClick={dismiss}
            className="flex-1 rounded-lg border border-zinc-700 px-4 py-2.5 text-center text-sm font-medium text-zinc-300 hover:bg-zinc-800"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
