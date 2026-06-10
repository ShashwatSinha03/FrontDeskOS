'use client';

import { useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchLeads, fetchPublicBusiness } from '@/lib/api';
import { DataTable, Column } from '@/components/admin/data-table';
import { Button } from '@/components/ui/button';
import { StatusBadge, lifecycleLevel } from '@/components/design/status-badge';
import { PageHeader } from '@/components/design/page-header';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Customer, CustomerLifecycleState } from '@/types';
import { CustomerLink } from '@/components/admin/customer-link';
import { AddLeadDialog } from '@/components/admin/add-lead-dialog';

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
      <StatusBadge level={lifecycleLevel(v)}>
        {v}
      </StatusBadge>
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
      <PageHeader
        title="Leads"
        description="Manage customer inquiries and track their lifecycle."
      >
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          Add Lead
        </Button>
      </PageHeader>

      <AddLeadDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={() => mutate()}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={stateFilter}
          onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}
        >
          {STATE_FILTERS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All States' : s}</option>
          ))}
        </Select>
        <Input
          type="text"
          placeholder="Search name, email, phone..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="flex-1 min-w-[200px]"
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
