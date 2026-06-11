'use client';

import { AlertTriangle, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionBannerProps {
  status: string;
}

export function SubscriptionBanner({ status }: SubscriptionBannerProps) {
  if (status === 'active' || status === 'trial') return null;

  if (status === 'past_due') {
    return (
      <div className="flex items-center gap-2 bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 text-sm text-amber-600">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>Your account has a billing issue. Please contact support.</span>
      </div>
    );
  }

  if (status === 'suspended' || status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 bg-red-500/10 border-b border-red-500/20 px-6 py-2.5 text-sm text-red-600">
        <Ban className="h-4 w-4 shrink-0" />
        <span>
          Your account is currently in read-only mode. Contact support to reactivate.
        </span>
      </div>
    );
  }

  return null;
}
