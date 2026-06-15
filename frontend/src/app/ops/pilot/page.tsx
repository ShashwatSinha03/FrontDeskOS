'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPilotHealth } from '@/lib/api/founder';
import { PageHeader } from '@/components/design/page-header';
import { DataTable } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/design/status-badge';

function riskLevel(risk: string | null | undefined) {
  switch (risk) {
    case 'healthy': return 'success';
    case 'warning': return 'warning';
    case 'critical': return 'danger';
    default: return 'neutral';
  }
}

const columns = [
  {
    key: 'name',
    label: 'Business',
    render: (_: any, row: any) => (
      <Link href={`/ops/businesses/${row.id}/health`} className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
        {row.name || row.businessName || 'Unknown'}
      </Link>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (v: string) => <StatusBadge level={v === 'disabled' ? 'danger' : 'success'}>{v || 'active'}</StatusBadge>,
  },
  {
    key: 'conversationsToday',
    label: 'Conversations Today',
    render: (v: any) => <span>{v ?? 0}</span>,
  },
  {
    key: 'leadsToday',
    label: 'Leads Today',
    render: (v: any) => <span>{v ?? 0}</span>,
  },
  {
    key: 'appointmentsToday',
    label: 'Appointments Today',
    render: (v: any) => <span>{v ?? 0}</span>,
  },
  {
    key: 'escalations',
    label: 'Escalations',
    render: (v: any) => <span>{v ?? 0}</span>,
  },
  {
    key: 'failedDeliveries',
    label: 'Failed Deliveries',
    render: (v: any) => <span>{v ?? 0}</span>,
  },
  {
    key: 'deliveryRate',
    label: 'Delivery Rate',
    render: (v: number | null) => <span>{v !== null && v !== undefined ? `${v}%` : '—'}</span>,
  },
  {
    key: 'risk',
    label: 'Risk',
    render: (v: string | null) => v ? <StatusBadge level={riskLevel(v)}>{v}</StatusBadge> : <StatusBadge level="neutral">unknown</StatusBadge>,
  },
];

export default function PilotHealthPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      const res = await getPilotHealth();
      if (res.success) setData(res.data || []);
      else setError(res.error || 'Failed to load');
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Pilot Health" description="Per-business operational health overview" />

      {error && !loading && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <DataTable
        columns={columns}
        data={data}
        totalCount={data.length}
        page={1}
        limit={100}
        onPageChange={() => {}}
        isLoading={loading}
        error={error || null}
        onRetry={() => window.location.reload()}
        emptyMessage="No businesses found"
      />
    </div>
  );
}
