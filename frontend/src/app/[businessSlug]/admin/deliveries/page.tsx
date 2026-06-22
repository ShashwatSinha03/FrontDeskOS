'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDeliveryHealth, getFailedDeliveries } from '@/lib/api/ops';
import { PageHeader } from '@/components/design/page-header';
import { MetricCard } from '@/components/design/metric-card';
import { DataTable } from '@/components/admin/data-table';
import { StatusBadge, statusLevel } from '@/components/design/status-badge';
import { Skeleton, CardSkeleton } from '@/components/design/skeleton';
import { MessageSquare, CheckCircle, XCircle, TrendingUp, Truck, AlertCircle } from 'lucide-react';

function formatDate(d: string) {
  return d ? new Date(d).toLocaleString() : '—';
}

export default function DeliveriesPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.businessSlug as string;

  const [health, setHealth] = useState<any>(null);
  const [failedData, setFailedData] = useState<any[]>([]);
  const [failedTotal, setFailedTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failedLoading, setFailedLoading] = useState(true);
  const [error, setError] = useState('');
  const [failedError, setFailedError] = useState('');
  const [failedPage, setFailedPage] = useState(1);
  const limit = 15;

  const loadHealth = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getDeliveryHealth();
    if (res.success) setHealth(res.data || res.summary ? res : res);
    else setError(res.error || 'Failed to load delivery health');
    setLoading(false);
  }, []);

  const loadFailed = useCallback(async () => {
    setFailedLoading(true);
    setFailedError('');
    const res = await getFailedDeliveries({ page: failedPage, limit });
    if (res.success) { setFailedData(res.data); setFailedTotal(res.meta?.totalCount ?? 0); }
    else setFailedError(res.error || 'Failed to load failed deliveries');
    setFailedLoading(false);
  }, [failedPage]);

  useEffect(() => {
    Promise.all([loadHealth(), loadFailed()]);
  }, []);

  const summary = health?.summary || health?.data?.summary || {};
  const channelBreakdown = health?.channelBreakdown || health?.data?.channelBreakdown || [];

  const failedColumns = [
    {
      key: 'provider',
      label: 'Provider',
      render: (v: string) => <span className="font-medium">{v || '—'}</span>,
    },
    {
      key: 'channel_type',
      label: 'Channel',
      render: (v: string) => <StatusBadge level={v?.toLowerCase() === 'whatsapp' ? 'success' : 'info'}>{v || '—'}</StatusBadge>,
    },
    {
      key: 'failure_reason',
      label: 'Error',
      render: (v: string) => <span className="text-xs text-muted-foreground max-w-[200px] block truncate">{v || '—'}</span>,
    },
    {
      key: 'created_at',
      label: 'Timestamp',
      render: (v: string) => <span className="text-xs text-muted-foreground">{formatDate(v)}</span>,
    },
    {
      key: 'conversation_id',
      label: 'Conversation',
      render: (v: string) => v ? (
        <button onClick={(e) => { e.stopPropagation(); router.push(`/${slug}/admin/conversations/${v}`); }}
          className="text-xs text-blue-600 hover:underline">
          View &rarr;
        </button>
      ) : <span className="text-muted-foreground">—</span>,
    },
  ];

  const totalDeliveries = summary.total_deliveries ?? summary.total ?? 0;
  const successful = summary.successful_deliveries ?? summary.successful ?? 0;
  const failed = summary.failed_deliveries ?? summary.failed ?? 0;
  const deliveryRate = summary.delivery_rate ?? summary.rate ?? null;

  return (
    <div className="space-y-6">
      <PageHeader title="Delivery Health" description="Message delivery status and failures" />

      {error && !loading && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total Deliveries" value={totalDeliveries} icon={Truck} />
          <MetricCard label="Successful" value={successful} icon={CheckCircle} />
          <MetricCard label="Failed" value={failed} icon={XCircle} />
          <MetricCard
            label="Delivery Rate"
            value={deliveryRate !== null && deliveryRate !== undefined ? `${deliveryRate}%` : '—'}
            icon={TrendingUp}
            trend={deliveryRate !== null && deliveryRate !== undefined ? { value: '', positive: deliveryRate >= 80 } : undefined}
          />
        </div>
      )}

      {!loading && channelBreakdown.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Channel Breakdown</h3>
          <div className="space-y-2">
            {channelBreakdown.map((ch: any, i: number) => (
              <div key={i} className="rounded-lg bg-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge level={ch.channel?.toLowerCase() === 'whatsapp' ? 'success' : 'info'}>
                    {ch.channel || ch.channel_type || 'Unknown'}
                  </StatusBadge>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-muted-foreground">Total: <strong>{ch.total_deliveries ?? ch.total ?? 0}</strong></span>
                  <span className="text-emerald-600">OK: <strong>{ch.successful_deliveries ?? ch.successful ?? 0}</strong></span>
                  <span className="text-red-600">Fail: <strong>{ch.failed_deliveries ?? ch.failed ?? 0}</strong></span>
                  <span className="text-muted-foreground">
                    Rate: <strong>{ch.delivery_rate ?? ch.rate ?? '—'}{ch.delivery_rate || ch.rate ? '%' : ''}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold">Failed Deliveries</h3>
        <DataTable
          columns={failedColumns}
          data={failedData}
          totalCount={failedTotal}
          page={failedPage}
          limit={limit}
          onPageChange={setFailedPage}
          isLoading={failedLoading}
          error={failedError || null}
          onRetry={loadFailed}
          emptyMessage="No failed deliveries"
        />
      </div>
    </div>
  );
}
