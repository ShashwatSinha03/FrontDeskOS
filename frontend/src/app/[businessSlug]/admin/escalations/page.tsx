'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchEscalations, fetchPublicBusiness } from '@/lib/api';
import { DataTable, Column } from '@/components/admin/data-table';
import { StatusBadge, statusLevel } from '@/components/design/status-badge';
import { PageHeader } from '@/components/design/page-header';
import { EscalationStatus } from '@/types';
import { CustomerLink } from '@/components/admin/customer-link';

const columns: Column[] = [
  {
    key: 'customerName',
    label: 'Customer',
    render: (v: string, row: any) => (
      <div className="flex items-center gap-2">
        <CustomerLink customerId={row.customerId} customerName={v}>
          {v || 'Unknown'}
        </CustomerLink>
        {row.customerEmail && <span className="text-xs text-muted-foreground hidden md:inline">{row.customerEmail}</span>}
      </div>
    ),
  },
  { key: 'reason', label: 'Reason' },
  {
    key: 'status',
    label: 'Status',
    render: (v: string) => (
      <StatusBadge level={statusLevel(v)}>
        {v}
      </StatusBadge>
    ),
  },
  {
    key: 'createdAt',
    label: 'Created',
    render: (v: string) => v ? new Date(v).toLocaleString() : '—',
  },
  {
    key: 'resolvedAt',
    label: 'Resolved',
    render: (v: string) => v ? new Date(v).toLocaleString() : '—',
  },
];

const STATUS_FILTERS: (EscalationStatus | 'all')[] = ['all', 'pending', 'resolved'];

export default function EscalationsPage() {
  const params = useParams();
  const slug = params.businessSlug as string;
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: bizData } = useSWR(slug ? `esc-biz-${slug}` : null, () =>
    fetchPublicBusiness(slug), { revalidateOnFocus: false }
  );
  const businessId = bizData?.success && bizData.data ? bizData.data.id : null;

  const { data, error, isLoading, mutate } = useSWR(
    businessId ? `esc-${businessId}-${statusFilter}-${page}` : null,
    () => fetchEscalations(
      businessId!,
      statusFilter === 'all' ? undefined : statusFilter as any,
      page,
      limit
    ),
    { revalidateOnFocus: false }
  );

  const escalations = (data?.success ? data.data : []) as any[];
  const totalCount = data?.meta?.totalCount ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Escalations"
        description="Conversations flagged for human attention."
      />

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={escalations}
        totalCount={totalCount}
        page={page}
        limit={limit}
        onPageChange={setPage}
        isLoading={isLoading}
        error={error ? 'Failed to load escalations.' : null}
        onRetry={() => mutate()}
        emptyMessage="No escalations found."
      />
    </div>
  );
}
