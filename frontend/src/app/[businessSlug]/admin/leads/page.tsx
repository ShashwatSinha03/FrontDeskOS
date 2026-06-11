'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getLeads, updateLeadLifecycle } from '@/lib/api/ops';

export default function LeadsPage() {
  const params = useParams();
  const slug = params.businessSlug as string;
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getLeads({ state: stateFilter, search: debouncedSearch || undefined, page, limit });
    if (res.success) { setData(res.data); setTotalCount(res.meta?.totalCount ?? 0); }
    else setError(res.error || 'Failed to load');
    setLoading(false);
  }, [stateFilter, debouncedSearch, page]);

  useEffect(() => { load(); }, [load]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  async function handleLifecycle(id: string, state: string) {
    setMsg('');
    setError('');
    const res = await updateLeadLifecycle(id, state);
    if (res.success) { setMsg(`Marked as ${state}`); load(); }
    else setError(res.error || 'Failed');
  }

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">{totalCount} total leads.</p>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {msg && <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{msg}</div>}

      <div className="flex flex-wrap items-center gap-3">
        <select value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}
          className="rounded-md border px-3 py-1.5 text-sm">
          <option value="all">All States</option>
          <option value="New Inquiry">New Inquiry</option>
          <option value="Qualified">Qualified</option>
          <option value="Booking Opportunity">Booking Opportunity</option>
          <option value="Booked">Booked</option>
          <option value="Customer">Customer</option>
          <option value="Follow-Up Pending">Follow-Up Pending</option>
          <option value="Escalated">Escalated</option>
          <option value="Lost">Lost</option>
        </select>
        <input type="text" value={search} onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search name, email, phone..."
          className="flex-1 min-w-[200px] rounded-md border px-3 py-1.5 text-sm" />
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No leads found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Contact</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Last Interaction</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((l: any) => (
                <tr key={l.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/${slug}/admin/leads/${l.id}`} className="font-medium hover:underline">
                      {l.name || 'Unknown'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {l.email && <div>{l.email}</div>}
                    {l.phone && <div className="text-xs">{l.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      l.lifecycleState === 'Lost' ? 'bg-red-100 text-red-700' :
                      l.lifecycleState === 'Qualified' ? 'bg-purple-100 text-purple-700' :
                      l.lifecycleState === 'Booked' || l.lifecycleState === 'Customer' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{l.lifecycleState}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {l.lastInteractionAt ? new Date(l.lastInteractionAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleLifecycle(l.id, 'Qualified')}
                        className="rounded border px-2 py-1 text-xs font-medium hover:bg-muted">Qualify</button>
                      <button onClick={() => handleLifecycle(l.id, 'Lost')}
                        className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Lost</button>
                      <Link href={`/${slug}/admin/leads/${l.id}`}
                        className="rounded border px-2 py-1 text-xs font-medium hover:bg-muted">View</Link>
                    </div>
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
