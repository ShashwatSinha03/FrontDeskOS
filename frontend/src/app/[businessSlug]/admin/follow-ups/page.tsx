'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchFollowUps, fetchPublicBusiness } from '@/lib/api';
import { DataTable, Column } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { FollowUpStatus, FollowUpType } from '@/types';
import { CustomerLink } from '@/components/admin/customer-link';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  sent: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

const TYPE_LABELS: Record<string, string> = {
  re_engagement: 'Re-engagement',
  day_1: 'Day 1',
  day_3: 'Day 3',
  missed_call: 'Missed Call',
};

const columns: Column[] = [
  {
    key: 'customerName',
    label: 'Customer',
    render: (v: string, row: any) => (
      <div className="flex items-center gap-2">
        <CustomerLink customerId={row.customerId} customerName={v}>
          {v || 'Unknown'}
        </CustomerLink>
      </div>
    ),
  },
  {
    key: 'type',
    label: 'Type',
    render: (v: string) => TYPE_LABELS[v] || v,
  },
  {
    key: 'channel',
    label: 'Channel',
    render: (v: string) => v || '—',
  },
  {
    key: 'status',
    label: 'Status',
    render: (v: string) => (
      <Badge className={STATUS_COLORS[v] || ''} variant="outline">
        {v}
      </Badge>
    ),
  },
  {
    key: 'scheduledAt',
    label: 'Scheduled',
    render: (v: string) => v ? new Date(v).toLocaleString() : '—',
  },
  {
    key: 'triggerReason',
    label: 'Reason',
    render: (v: string) => v || '—',
  },
];

const STATUS_FILTERS: (FollowUpStatus | 'all')[] = ['all', 'pending', 'sent', 'cancelled'];
const TYPE_FILTERS: (FollowUpType | 'all')[] = ['all', 're_engagement', 'day_1', 'day_3', 'missed_call'];

export default function FollowUpsPage() {
  const params = useParams();
  const slug = params.businessSlug as string;
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: bizData } = useSWR(slug ? `fu-biz-${slug}` : null, () =>
    fetchPublicBusiness(slug), { revalidateOnFocus: false }
  );
  const businessId = bizData?.success && bizData.data ? bizData.data.id : null;

  const { data, error, isLoading, mutate } = useSWR(
    businessId ? `fu-${businessId}-${statusFilter}-${typeFilter}-${page}` : null,
    () => fetchFollowUps(businessId!, {
      status: statusFilter === 'all' ? undefined : statusFilter as any,
      type: typeFilter === 'all' ? undefined : typeFilter as any,
      page,
      limit,
    }),
    { revalidateOnFocus: false }
  );

  const followUps = (data?.success ? data.data : []) as any[];
  const totalCount = data?.meta?.totalCount ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Follow-Ups</h1>
        <p className="text-muted-foreground mt-1">Automated re-engagement messages scheduled for customers.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          {TYPE_FILTERS.map((t) => (
            <option key={t} value={t}>{t === 'all' ? 'All Types' : TYPE_LABELS[t] || t}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={followUps}
        totalCount={totalCount}
        page={page}
        limit={limit}
        onPageChange={setPage}
        isLoading={isLoading}
        error={error ? 'Failed to load follow-ups.' : null}
        onRetry={() => mutate()}
        emptyMessage="No follow-ups found."
      />
    </div>
  );
}
