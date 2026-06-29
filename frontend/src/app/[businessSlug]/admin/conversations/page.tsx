'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getConversations } from '@/lib/api/ops';
import { PageHeader } from '@/components/design/page-header';
import { DataTable } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/design/status-badge';

function workflowLevel(ws: string) {
  switch (ws) {
    case 'booking': return 'info';
    case 'idle': return 'warning';
    case 'completed': return 'success';
    default: return 'neutral';
  }
}

function channelLevel(ch: string) {
  switch (ch?.toLowerCase()) {
    case 'whatsapp': return 'success';
    case 'web chat': return 'info';
    default: return 'neutral';
  }
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  const date = new Date(d);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

const columns = [
  {
    key: 'customer_name',
    label: 'Customer',
    render: (_: any, row: any) => (
      <div>
        <div className="font-medium">{row.customer_name || 'Unknown'}</div>
        <div className="text-xs text-muted-foreground">{row.phone || '—'}</div>
      </div>
    ),
  },
  {
    key: 'channel_type',
    label: 'Channel',
    render: (v: string) => <StatusBadge level={channelLevel(v)}>{v || '—'}</StatusBadge>,
  },
  {
    key: 'last_message',
    label: 'Last Message',
    render: (v: string | null) => (
      <span className="text-muted-foreground text-xs">
        {v ? (v.length > 80 ? v.slice(0, 80) + '...' : v) : '—'}
      </span>
    ),
  },
  {
    key: 'last_message_at',
    label: 'Last Activity',
    render: (_: any, row: any) => (
      <span className="text-xs text-muted-foreground">{formatDate(row.last_message_at || row.updated_at)}</span>
    ),
  },
  {
    key: 'workflow_state',
    label: 'Workflow State',
    render: (v: string | null) => v ? <StatusBadge level={workflowLevel(v)}>{v}</StatusBadge> : <span className="text-muted-foreground">—</span>,
  },
  {
    key: 'has_pending_escalation',
    label: 'Badges',
    render: (v: boolean) => v ? <StatusBadge level="danger">Escalated</StatusBadge> : null,
  },
];

export default function ConversationsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.businessSlug as string;

  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('');
  const [workflowState, setWorkflowState] = useState('');
  const [escalated, setEscalated] = useState('');
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getConversations({
      search: search || undefined,
      channel: channel || undefined,
      workflowState: workflowState || undefined,
      escalated: escalated === 'yes' ? true : escalated === 'no' ? false : undefined,
      page,
      limit,
    });
    if (res.success) { setData(res.data); setTotalCount(res.meta?.totalCount ?? 0); }
    else setError(res.error || 'Failed to load');
    setLoading(false);
  }, [search, channel, workflowState, escalated, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader title="Conversations" description="Customer conversations and workflow states" />

      {error && !loading && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, phone, or ID..."
          className="rounded-md border px-3 py-1.5 text-sm w-64"
        />
        <select value={channel} onChange={(e) => { setChannel(e.target.value); setPage(1); }}
          className="rounded-md border px-3 py-1.5 text-sm">
          <option value="">All Channels</option>
          <option value="Web Chat">Web Chat</option>
          <option value="WhatsApp">WhatsApp</option>
        </select>
        <select value={workflowState} onChange={(e) => { setWorkflowState(e.target.value); setPage(1); }}
          className="rounded-md border px-3 py-1.5 text-sm">
          <option value="">All Workflow States</option>
          <option value="booking">Booking</option>
          <option value="idle">Idle</option>
          <option value="completed">Completed</option>
        </select>
        <select value={escalated} onChange={(e) => { setEscalated(e.target.value); setPage(1); }}
          className="rounded-md border px-3 py-1.5 text-sm">
          <option value="">All Escalations</option>
          <option value="yes">Escalated</option>
          <option value="no">Not Escalated</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data}
        totalCount={totalCount}
        page={page}
        limit={limit}
        onPageChange={setPage}
        isLoading={loading}
        error={error || null}
        onRetry={load}
        emptyMessage="No conversations found. Conversations will appear here when customers start chatting."
        onRowClick={(row) => router.push(`/${slug}/admin/conversations/${row.id}`)}
      />
    </div>
  );
}
