'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchAppointments, fetchPublicBusiness } from '@/lib/api';
import { DataTable, Column } from '@/components/admin/data-table';
import { StatusBadge, statusLevel } from '@/components/design/status-badge';
import { PageHeader } from '@/components/design/page-header';
import { Select } from '@/components/ui/select';
import { AppointmentStatus } from '@/types';
import { CustomerLink } from '@/components/admin/customer-link';

const columns: Column[] = [
  {
    key: 'customerName',
    label: 'Customer',
    render: (v: string, row: any) => (
      <CustomerLink customerId={row.customerId} customerName={v}>
        {v || 'Unknown'}
      </CustomerLink>
    ),
  },
  {
    key: 'appointmentTime',
    label: 'Date & Time',
    render: (v: string) => v ? new Date(v).toLocaleString() : '—',
  },
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
    key: 'serviceName',
    label: 'Service',
    render: (v: string) => v || '—',
  },
  { key: 'notes', label: 'Notes', render: (v) => v || '—' },
  {
    key: 'createdAt',
    label: 'Booked On',
    render: (v: string) => v ? new Date(v).toLocaleDateString() : '—',
  },
];

const STATUS_FILTERS: (AppointmentStatus | 'all')[] = ['all', 'pending', 'confirmed', 'cancelled', 'rescheduled'];

export default function AppointmentsPage() {
  const params = useParams();
  const slug = params.businessSlug as string;
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: bizData } = useSWR(slug ? `appts-biz-${slug}` : null, () =>
    fetchPublicBusiness(slug), { revalidateOnFocus: false }
  );
  const businessId = bizData?.success && bizData.data ? bizData.data.id : null;

  const { data, error, isLoading, mutate } = useSWR(
    businessId ? `appts-${businessId}-${statusFilter}-${page}` : null,
    () => fetchAppointments(businessId!, {
      status: statusFilter === 'all' ? undefined : statusFilter as any,
      page,
      limit,
    }),
    { revalidateOnFocus: false }
  );

  const appointments = (data?.success ? data.data : []) as any[];
  const totalCount = data?.meta?.totalCount ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="View and manage all appointments."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={appointments}
        totalCount={totalCount}
        page={page}
        limit={limit}
        onPageChange={setPage}
        isLoading={isLoading}
        error={error ? 'Failed to load appointments.' : null}
        onRetry={() => mutate()}
        emptyMessage="No appointments found."
      />
    </div>
  );
}
