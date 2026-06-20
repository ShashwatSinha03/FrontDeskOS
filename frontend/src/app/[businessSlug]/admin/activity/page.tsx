'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getActivity } from '@/lib/api/ops';
import { PageHeader } from '@/components/design/page-header';
import { EmptyState } from '@/components/design/empty-state';
import { Skeleton } from '@/components/design/skeleton';
import { UserPlus, Calendar, AlertTriangle, CheckCircle, UserCheck, Activity, AlertCircle } from 'lucide-react';

function eventIcon(eventType: string) {
  switch (eventType) {
    case 'lead_created': return UserPlus;
    case 'appointment_booked': return Calendar;
    case 'escalation_raised': return AlertTriangle;
    case 'escalation_resolved': return CheckCircle;
    case 'staff_invited': return UserCheck;
    default: return Activity;
  }
}

function eventColor(eventType: string) {
  switch (eventType) {
    case 'lead_created': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'appointment_booked': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'escalation_raised': return 'text-red-600 bg-red-50 border-red-200';
    case 'escalation_resolved': return 'text-green-600 bg-green-50 border-green-200';
    case 'staff_invited': return 'text-purple-600 bg-purple-50 border-purple-200';
    default: return 'text-zinc-600 bg-zinc-50 border-zinc-200';
  }
}

function formatRelativeTime(d: string) {
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

export default function ActivityPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.businessSlug as string;

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getActivity({ limit: 50 });
    if (res.success) setData(res.data || []);
    else setError(res.error || 'Failed to load activity');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader title="Activity Log" description="Recent system activity" />

      {error && !loading && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="rounded border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState icon={Activity} title="No activity recorded yet" description="System activity will appear here as actions are taken." />
      ) : (
        <div className="space-y-0">
          {(data as any[]).map((item: any, i: number) => {
            const Icon = eventIcon(item.event_type);
            const colorClasses = eventColor(item.event_type);
            return (
              <div key={i} className="flex items-start gap-4 py-4 border-b last:border-0">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card ${colorClasses}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{item.description || item.event_type || 'Activity'}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatRelativeTime(item.occurred_at || item.created_at)}</span>
                    {item.customerId && (
                      <button onClick={() => router.push(`/${slug}/admin/leads/${item.customerId}`)}
                        className="text-blue-600 hover:underline">
                        View lead &rarr;
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
