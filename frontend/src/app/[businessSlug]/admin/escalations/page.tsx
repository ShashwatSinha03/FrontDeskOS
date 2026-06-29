'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getEscalations, resolveEscalation } from '@/lib/api/ops';
import { PageHeader } from '@/components/design/page-header';
import { DataTable } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/design/status-badge';
import { Button } from '@/components/ui/button';

export default function EscalationsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.businessSlug as string;

  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getEscalations({ status: statusFilter, search: search || undefined, page, limit });
    if (res.success) { setData(res.data); setTotalCount(res.meta?.totalCount ?? 0); }
    else setError(res.error || 'Failed to load');
    setLoading(false);
  }, [statusFilter, search, page]);

  useEffect(() => { load(); }, [load]);

  async function handleResolve(id: string) {
    setMsg('');
    setError('');
    const res = await resolveEscalation(id, resolveNote || undefined);
    if (res.success) {
      setMsg('Escalation resolved.');
      setResolveId(null);
      setResolveNote('');
      load();
    } else setError(res.error || 'Failed');
  }

  const columns = [
    {
      key: 'customerName',
      label: 'Customer',
      render: (_: any, row: any) => (
        <div>
          <div className="font-medium">{row.customerName || 'Unknown'}</div>
          <div className="text-xs text-muted-foreground">{row.customerPhone || row.phone || '—'}</div>
        </div>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (v: string) => (
        <span className="text-muted-foreground text-xs max-w-[200px] block truncate">
          {v ? (v.length > 100 ? v.slice(0, 100) + '...' : v) : '—'}
        </span>
      ),
    },
    {
      key: 'conversationId',
      label: 'Conversation',
      render: (v: string) => v ? (
        <button onClick={(e) => { e.stopPropagation(); router.push(`/${slug}/admin/conversations/${v}`); }}
          className="text-xs text-blue-600 hover:text-blue-700 underline">
          {v.slice(0, 8)}...
        </button>
      ) : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (v: string) => (
        <StatusBadge level={v === 'resolved' ? 'success' : 'danger'}>{v || 'pending'}</StatusBadge>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (v: string) => (
        <span className="text-xs text-muted-foreground">{v ? new Date(v).toLocaleString() : '—'}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div onClick={(e) => e.stopPropagation()}>
          {row.status === 'pending' ? (
            resolveId === row.id ? (
              <div className="flex items-center gap-1">
                <input type="text" value={resolveNote} onChange={(e) => setResolveNote(e.target.value)}
                  placeholder="Note (optional)" className="w-28 rounded border px-2 py-1 text-xs" />
                <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleResolve(row.id)}>Resolve</Button>
                <Button size="sm" variant="outline" onClick={() => { setResolveId(null); setResolveNote(''); }}>X</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setResolveId(row.id)}>Resolve</Button>
            )
          ) : (
            <span className="text-xs text-muted-foreground">
              {row.resolvedAt ? new Date(row.resolvedAt).toLocaleDateString() : '-'}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Escalations" description={`${totalCount} escalations.`} />

      {msg && <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{msg}</div>}
      {error && !loading && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by customer name or phone..."
          className="rounded-md border px-3 py-1.5 text-sm w-64"
        />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border px-3 py-1.5 text-sm">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
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
        emptyMessage="No escalations found."
      />
    </div>
  );
}
