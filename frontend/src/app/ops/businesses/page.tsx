'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, ExternalLink, Search, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/design/page-header';
import { StatusBadge } from '@/components/design/status-badge';
import { DataTable } from '@/components/admin/data-table';
import { EmptyState } from '@/components/design/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fetchBusinesses, FounderBusiness } from '@/lib/founder';

const HEALTH_BADGE: Record<string, 'success' | 'warning' | 'danger'> = {
  healthy: 'success',
  attention: 'warning',
  critical: 'danger',
};

export default function BusinessesPage() {
  const router = useRouter();
  const [data, setData] = useState<FounderBusiness[]>([]);
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
      const res = await fetchBusinesses({ page, limit, search: search || undefined });
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
    { key: 'name', label: 'Business', render: (_: any, row: FounderBusiness) => (
      <Link href={`/ops/businesses/${row.id}`} className="font-medium hover:text-primary transition-colors">
        {row.name}
      </Link>
    )},
    { key: 'slug', label: 'Slug', render: (v: string) => (
      <code className="text-xs text-muted-foreground">{v}</code>
    )},
    { key: 'health', label: 'Health', render: (v: string) => (
      <StatusBadge level={HEALTH_BADGE[v] || 'neutral'}>{v}</StatusBadge>
    )},
    { key: 'planName', label: 'Plan', render: (v: string | null) => v || '—' },
    { key: 'leadCount', label: 'Leads' },
    { key: 'appointmentCount', label: 'Appts' },
    { key: 'escalationCount', label: 'Esc' },
    { key: 'actions', label: '', render: (_: any, row: FounderBusiness) => (
      <div className="flex items-center gap-1">
        <a href={`https://frontdeskos.vercel.app/${row.slug}`} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          Site <ExternalLink className="h-3 w-3" />
        </a>
        <a href={`https://frontdeskos.vercel.app/${row.slug}/admin`} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          Admin <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Businesses" description={`${total} total businesses`}>
        <Link href="/ops/onboarding">
          <Button size="sm"><Building2 className="h-3.5 w-3.5" /> Onboard New</Button>
        </Link>
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search businesses..."
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
        onRowClick={(row) => router.push(`/ops/businesses/${row.id}`)}
      />
    </div>
  );
}
