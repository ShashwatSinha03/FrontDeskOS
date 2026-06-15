'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getBusinessHealth } from '@/lib/api/founder';
import { PageHeader } from '@/components/design/page-header';
import { MetricCard } from '@/components/design/metric-card';
import { EmptyState } from '@/components/design/empty-state';
import { StatusBadge, statusLevel } from '@/components/design/status-badge';
import { Skeleton, CardSkeleton } from '@/components/design/skeleton';
import { ArrowLeft, MessageSquare, UserPlus, Calendar, AlertTriangle, Truck, Activity, AlertCircle } from 'lucide-react';

export default function BusinessHealthPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getBusinessHealth(id);
    if (res.success) setData(res.data);
    else if (res.statusCode === 404) setData(null);
    else setError(res.error || 'Failed to load business health');
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-64" />
        <CardSkeleton count={4} />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link href="/ops/businesses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Businesses
        </Link>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="rounded border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Link href="/ops/businesses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Businesses
        </Link>
        <EmptyState icon={AlertCircle} title="Business not found" description="This business could not be found." />
      </div>
    );
  }

  const { business, metrics, deliveryHealth, recentActivity } = data;

  function formatDate(d: string | null | undefined) {
    if (!d) return '—';
    return new Date(d).toLocaleString();
  }

  function formatRelativeTime(d: string | null | undefined) {
    if (!d) return '—';
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <div className="space-y-6">
      <Link href="/ops/businesses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Businesses
      </Link>

      <PageHeader title={business?.name || 'Business Health'} description={`Operational health for ${business?.slug || id}`} />

      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-sm font-semibold mb-4">Business Information</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{business?.name || '—'}</span></div>
          <div><span className="text-muted-foreground">Slug:</span> <span className="font-medium">{business?.slug || '—'}</span></div>
          <div>
            <span className="text-muted-foreground">Status:</span>{' '}
            <StatusBadge level={business?.status === 'disabled' ? 'danger' : 'success'}>{business?.status || 'active'}</StatusBadge>
          </div>
          <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{business?.business_type || '—'}</span></div>
          <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{business?.phone || '—'}</span></div>
          <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{business?.email || '—'}</span></div>
          <div><span className="text-muted-foreground">Timezone:</span> <span className="font-medium">{business?.timezone || '—'}</span></div>
          <div><span className="text-muted-foreground">Owner:</span> <span className="font-medium">{business?.owner_name || '—'}</span></div>
          <div><span className="text-muted-foreground">Owner Email:</span> <span className="font-medium">{business?.owner_email || '—'}</span></div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Conversations Today" value={metrics?.conversationsToday ?? metrics?.conversations ?? 0} icon={MessageSquare} />
        <MetricCard label="Leads Today" value={metrics?.leadsToday ?? metrics?.leads ?? 0} icon={UserPlus} />
        <MetricCard label="Appointments Today" value={metrics?.appointmentsToday ?? metrics?.appointments ?? 0} icon={Calendar} />
        <MetricCard label="Pending Escalations" value={metrics?.pendingEscalations ?? metrics?.escalations ?? 0} icon={AlertTriangle} />
      </div>

      {deliveryHealth && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Truck className="h-4 w-4 text-muted-foreground" /> Delivery Health (7 days)
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Total Deliveries" value={deliveryHealth.totalDeliveries ?? deliveryHealth.total ?? 0} />
            <MetricCard label="Failed Deliveries" value={deliveryHealth.failedDeliveries ?? deliveryHealth.failed ?? 0} />
            <MetricCard
              label="Delivery Rate"
              value={deliveryHealth.deliveryRate !== null && deliveryHealth.deliveryRate !== undefined ? `${deliveryHealth.deliveryRate}%` : '—'}
              trend={deliveryHealth.deliveryRate !== null && deliveryHealth.deliveryRate !== undefined ? { value: '', positive: deliveryHealth.deliveryRate >= 80 } : undefined}
            />
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Activity className="h-4 w-4 text-muted-foreground" /> Recent Activity
        </h3>
        {recentActivity && recentActivity.length > 0 ? (
          <div className="space-y-0">
            {(recentActivity as any[]).map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-4 py-3 border-b last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{item.description || item.event_type || 'Activity'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeTime(item.occurred_at || item.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        )}
      </div>
    </div>
  );
}
