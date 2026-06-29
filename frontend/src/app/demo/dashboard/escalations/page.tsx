'use client';

import { useDemo, useDemoStore } from '@/lib/demo/stores/demo-provider';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function DemoEscalationsPage() {
  const { dashboard } = useDemo();
  const metrics = useDemoStore(dashboard, () => dashboard.metrics);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Escalations</h1>
      <p className="mt-1 text-sm text-zinc-500">{metrics.escalationsPending} pending</p>
      <div className="mt-6 product-card border-amber-500/20 p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-400" />
          <div>
            <p className="font-medium text-amber-300">Mike Chen requested human assistance</p>
            <p className="text-sm text-amber-400/70">Waiting for 2 minutes</p>
          </div>
          <Link
            href="/demo/inbox/conv-mike"
            className="ml-auto rounded-lg bg-amber-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500/80"
          >
            View in Inbox
          </Link>
        </div>
      </div>
    </div>
  );
}
