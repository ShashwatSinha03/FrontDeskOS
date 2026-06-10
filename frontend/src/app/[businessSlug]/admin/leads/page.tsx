'use client';

import { useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchLeads, fetchPublicBusiness } from '@/lib/api';
import { DataTable, Column } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { Customer, CustomerLifecycleState } from '@/types';
import { CustomerLink } from '@/components/admin/customer-link';
import { AddLeadDialog } from '@/components/admin/add-lead-dialog';

const LIFECYCLE_COLORS: Record<string, string> = {
  'New Inquiry': 'bg-blue-100 text-blue-700',
  'Information Gathering': 'bg-purple-100 text-purple-700',
  'Qualified': 'bg-teal-100 text-teal-700',
  'Booking Opportunity': 'bg-amber-100 text-amber-700',
  'Booked': 'bg-green-100 text-green-700',
  'Customer': 'bg-emerald-100 text-emerald-700',
  'Follow-Up Pending': 'bg-orange-100 text-orange-700',
  'Escalated': 'bg-red-100 text-red-700',
  'Lost': 'bg-gray-100 text-gray-700',
};

const columns: Column<Customer>[] = [
  {
    key: 'name',
    label: 'Name',
    render: (v: string, row: Customer) => (
      <CustomerLink customerId={row.id} customerName={v}>
        {v || '—'}
      </CustomerLink>
    ),
  },
  { key: 'email', label: 'Email', render: (v) => v || '—' },
  { key: 'phone', label: 'Phone', render: (v) => v || '—' },
  {
    key: 'lifecycleState',
    label: 'State',
    render: (v: string) => (
      <Badge className={LIFECYCLE_COLORS[v] || ''} variant="outline">
        {v}
      </Badge>
    ),
  },
  {
    key: 'lastInteractionAt',
    label: 'Last Interaction',
    render: (v: string) => v ? new Date(v).toLocaleDateString() : '—',
  },
  {
    key: 'createdAt',
    label: 'Created',
    render: (v: string) => v ? new Date(v).toLocaleDateString() : '—',
  },
];

const STATE_FILTERS: (CustomerLifecycleState | 'all')[] = [
  'all', 'New Inquiry', 'Information Gathering', 'Qualified',
  'Booking Opportunity', 'Booked', 'Customer', 'Follow-Up Pending', 'Escalated', 'Lost',
];

export default function LeadsPage() {
  const params = useParams();
  const slug = params.businessSlug as string;
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limit = 10;

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  const { data: bizData } = useSWR(slug ? `leads-biz-${slug}` : null, () =>
    fetchPublicBusiness(slug), { revalidateOnFocus: false }
  );
  const businessId = bizData?.success && bizData.data ? bizData.data.id : null;

  const { data, error, isLoading, mutate } = useSWR(
    businessId ? `leads-${businessId}-${stateFilter}-${debouncedSearch}-${page}` : null,
    () => fetchLeads(
      businessId!,
      stateFilter === 'all' ? undefined : stateFilter as any,
      search || undefined,
      page,
      limit
    ),
    { revalidateOnFocus: false }
  );

  const leads = (data?.success ? data.data : []) as Customer[];
  const totalCount = data?.meta?.totalCount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground mt-1">Manage customer inquiries and track their lifecycle.</p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          + Add Lead
        </button>
      </div>

      <AddLeadDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={() => mutate()}
      />

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={stateFilter}
          onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          {STATE_FILTERS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All States' : s}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search name, email, phone..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm flex-1 min-w-[200px]"
        />
      </div>

      <DataTable
        columns={columns}
        data={leads}
        totalCount={totalCount}
        page={page}
        limit={limit}
        onPageChange={setPage}
        isLoading={isLoading}
        error={error ? 'Failed to load leads.' : null}
        onRetry={() => mutate()}
        emptyMessage="No leads found matching your filters."
      />
    </div>
  );
}
