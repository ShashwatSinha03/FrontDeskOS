'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getEscalations, resolveEscalation } from '@/lib/api/ops';

export default function EscalationsPage() {
  const params = useParams();
  const slug = params.businessSlug as string;
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getEscalations({ status: statusFilter, page, limit });
    if (res.success) { setData(res.data); setTotalCount(res.meta?.totalCount ?? 0); }
    else setError(res.error || 'Failed to load');
    setLoading(false);
  }, [statusFilter, page]);

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

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Escalations</h1>
        <p className="mt-1 text-sm text-muted-foreground">{totalCount} escalations.</p>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {msg && <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{msg}</div>}

      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border px-3 py-1.5 text-sm">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No escalations found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Reason</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((e: any) => (
                <tr key={e.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{e.customerName || 'Unknown'}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{e.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      e.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>{e.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {e.status === 'pending' && (
                      resolveId === e.id ? (
                        <div className="flex items-center gap-1">
                          <input type="text" value={resolveNote} onChange={(e) => setResolveNote(e.target.value)}
                            placeholder="Note (optional)" className="w-32 rounded border px-2 py-1 text-xs" />
                          <button onClick={() => handleResolve(e.id)}
                            className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700">Resolve</button>
                          <button onClick={() => { setResolveId(null); setResolveNote(''); }}
                            className="rounded border px-2 py-1 text-xs font-medium hover:bg-muted">X</button>
                        </div>
                      ) : (
                        <button onClick={() => setResolveId(e.id)}
                          className="rounded border px-2 py-1 text-xs font-medium hover:bg-muted">Resolve</button>
                      )
                    )}
                    {e.status === 'resolved' && (
                      <span className="text-xs text-muted-foreground">
                        {e.resolvedAt ? new Date(e.resolvedAt).toLocaleDateString() : '-'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="rounded border px-3 py-1 text-sm font-medium hover:bg-muted disabled:opacity-50">Previous</button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="rounded border px-3 py-1 text-sm font-medium hover:bg-muted disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
