'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/design/page-header';
import { StatusBadge } from '@/components/design/status-badge';
import { DataTable } from '@/components/admin/data-table';
import { Input } from '@/components/ui/input';
import { fetchEscalations, FounderEscalation } from '@/lib/founder';

export default function EscalationsPage() {
  const [data, setData] = useState<FounderEscalation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchEscalations({ page, limit, search: search || undefined });
      setData(res.data);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'businessName', label: 'Business' },
    { key: 'customerName', label: 'Customer', render: (v: string | null) => v || '—' },
    { key: 'reason', label: 'Issue', render: (v: string) => (
      <span className="truncate block max-w-xs">{v}</span>
    )},
    { key: 'status', label: 'Status', render: (v: string) => (
      <StatusBadge level={v === 'pending' ? 'danger' : 'success'}>{v}</StatusBadge>
    )},
    { key: 'createdAt', label: 'Created', render: (v: string) => new Date(v).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Escalations"
        description={`${total} escalations across all businesses`}
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by issue or customer..."
          className="pl-9"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <DataTable
        columns={columns}
        data={data}
        totalCount={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        isLoading={loading}
        error={error}
        onRetry={load}
      />
    </div>
  );
}
