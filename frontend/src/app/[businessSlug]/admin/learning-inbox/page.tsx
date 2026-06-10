'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchKnowledgeRequests, fetchPublicBusiness } from '@/lib/api';
import { DataTable, Column } from '@/components/admin/data-table';
import { StatusBadge, statusLevel } from '@/components/design/status-badge';
import { PageHeader } from '@/components/design/page-header';
import { LearningInboxDetail } from '@/components/admin/learning-inbox-detail';
import { KnowledgeRequest, KnowledgeRequestStatus } from '@/types';
import { CustomerLink } from '@/components/admin/customer-link';

const STATUS_TABS: { label: string; value: KnowledgeRequestStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

export default function LearningInboxPage() {
  const params = useParams();
  const slug = params.businessSlug as string;
  const [statusTab, setStatusTab] = useState<KnowledgeRequestStatus | 'all'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<KnowledgeRequest | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: bizData } = useSWR(slug ? `li-biz-${slug}` : null, () =>
    fetchPublicBusiness(slug), { revalidateOnFocus: false }
  );
  const businessId = bizData?.success && bizData.data ? bizData.data.id : null;

  const { data, error, isLoading, mutate } = useSWR(
    businessId ? `li-${businessId}-${statusTab}-${page}` : null,
    () => fetchKnowledgeRequests(
      businessId!,
      statusTab === 'all' ? undefined : statusTab as KnowledgeRequestStatus,
      page,
      limit
    ),
    { revalidateOnFocus: false }
  );

  const requests = (data?.success ? data.data : []) as KnowledgeRequest[];
  const totalCount = data?.meta?.totalCount ?? 0;

  const columns: Column<KnowledgeRequest>[] = [
    {
      key: 'unansweredQuestion',
      label: 'Question',
      render: (v: string) => (
        <span className="line-clamp-1 max-w-xs">{v}</span>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (v: string, row: any) => (
        row.customerId ? (
          <CustomerLink customerId={row.customerId} customerName={v}>
            {v || 'Unknown'}
          </CustomerLink>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      ),
    },
    {
      key: 'suggestedAnswer',
      label: 'Suggested Answer',
      render: (v: string | null) => (
        <span className="line-clamp-1 max-w-xs text-muted-foreground">{v || '—'}</span>
      ),
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
      key: 'createdAt',
      label: 'Created',
      render: (v: string) => v ? new Date(v).toLocaleDateString() : '—',
    },
  ];

  const handleRowClick = (row: KnowledgeRequest) => {
    if (row.status === 'pending') {
      setSelectedRequest(row);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning Inbox"
        description="Review and approve answers to questions the AI couldn't answer."
      />

      {/* Status tabs */}
      <div className="flex gap-0 border-b">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusTab(tab.value); setPage(1); setSelectedRequest(null); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              statusTab === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <DataTable
            columns={columns}
            data={requests}
            totalCount={totalCount}
            page={page}
            limit={limit}
            onPageChange={setPage}
            isLoading={isLoading}
            error={error ? 'Failed to load knowledge requests.' : null}
            onRetry={() => mutate()}
            emptyMessage="No knowledge requests found."
            onRowClick={handleRowClick}
          />
        </div>

        {selectedRequest && (
          <LearningInboxDetail
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onAction={() => {
              setSelectedRequest(null);
              mutate();
            }}
          />
        )}
      </div>
    </div>
  );
}
