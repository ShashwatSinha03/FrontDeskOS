'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CreditCard, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/design/page-header';
import { StatusBadge } from '@/components/design/status-badge';
import { Card } from '@/components/ui/card';

interface Subscription {
  id: string;
  planName: string;
  planType: string;
  status: string;
  amount: number;
  currency: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  createdAt: string;
}

interface BillingEvent {
  id: string;
  event_type: string;
  previous_status: string | null;
  new_status: string | null;
  note: string | null;
  created_at: string;
}

interface BillingData {
  subscription: Subscription | null;
  events: BillingEvent[];
  supportContact: string;
}

function statusLevel(s: string) {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
    active: 'success',
    past_due: 'warning',
    suspended: 'danger',
    cancelled: 'neutral',
    trial: 'info' as any,
  };
  return map[s] || 'neutral';
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatAmount(amount: number, currency: string) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function BillingPage() {
  const params = useParams<{ businessSlug: string }>();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const slug = params.businessSlug;
    fetch('/api/admin/settings/billing?slug=' + encodeURIComponent(slug))
      .then(r => r.json())
      .then(json => {
        if (json.success) setData(json.data);
        else setError(json.error || 'Failed to load billing');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.businessSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading billing info...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const sub = data?.subscription;

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Manage your subscription and view billing history" />

      {sub ? (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Current Plan
            </div>
            <p className="text-lg font-semibold">{sub.planName}</p>
            <div className="flex items-center gap-2">
              <StatusBadge level={statusLevel(sub.status) as any}>{sub.status.replace('_', ' ')}</StatusBadge>
              <span className="text-sm text-muted-foreground">{formatAmount(sub.amount, sub.currency)}/{sub.billingCycle}</span>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Billing Period
            </div>
            <div className="space-y-1">
              <p className="text-sm">
                <span className="text-muted-foreground">Started:</span>{' '}
                {formatDate(sub.currentPeriodStart)}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Renewal:</span>{' '}
                {formatDate(sub.currentPeriodEnd)}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Cycle:</span>{' '}
                <span className="capitalize">{sub.billingCycle}</span>
              </p>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Support
            </div>
            <p className="text-sm">
              Questions about your bill?{' '}
              <a href={`mailto:${data?.supportContact}`} className="text-primary hover:underline">
                {data?.supportContact}
              </a>
            </p>
          </Card>
        </div>
      ) : (
        <Card className="p-6 text-center text-muted-foreground">
          No subscription information available.
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Billing History</h2>
        {data?.events && data.events.length > 0 ? (
          <div className="space-y-2">
            {data.events.map((event) => (
              <div key={event.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium capitalize">
                    {event.event_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.previous_status && event.new_status
                      ? `${event.previous_status} → ${event.new_status}`
                      : event.note || ''}
                  </p>
                </div>
                <time className="text-xs text-muted-foreground">{formatDate(event.created_at)}</time>
              </div>
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center text-muted-foreground">
            No billing history yet.
          </Card>
        )}
      </div>
    </div>
  );
}
