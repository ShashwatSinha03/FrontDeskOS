'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getLeads, updateLeadLifecycle } from '@/lib/api/ops';
import { Loader } from '@/components/ui/loader';

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
        <h1 className="text-2xl font-semibold tracking-tight text-white">Leads</h1>
        <p className="mt-1 text-sm text-zinc-400">{totalCount} total leads.</p>
      </div>

      {error && <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
      {msg && <div className="rounded-md border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">{msg}</div>}

      <div className="flex flex-wrap items-center gap-3">
        <select value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white">
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
          className="flex-1 min-w-[200px] rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]"><Loader size={40} color="#a3a3a3" /></div>
      ) : data.length === 0 ? (
        <p className="text-sm text-zinc-400">No leads found.</p>
      ) : (
        <div className="overflow-x-auto product-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-black/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Last Interaction</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {data.map((l: any) => (
                <tr key={l.id} className="hover:bg-zinc-800/30 transition-colors duration-150">
                  <td className="px-4 py-3">
                    <Link href={`/${slug}/admin/leads/${l.id}`} className="font-medium text-white hover:underline">
                      {l.name || 'Unknown'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {l.email && <div>{l.email}</div>}
                    {l.phone && <div className="text-xs">{l.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      l.lifecycleState === 'Lost' ? 'border-red-500/20 bg-red-500/10 text-red-400' :
                      l.lifecycleState === 'Qualified' ? 'border-purple-500/20 bg-purple-500/10 text-purple-400' :
                      l.lifecycleState === 'Booked' || l.lifecycleState === 'Customer' ? 'border-green-500/20 bg-green-500/10 text-green-400' :
                      'border-zinc-700 bg-zinc-800 text-zinc-300'
                    }`}>{l.lifecycleState}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {l.lastInteractionAt ? new Date(l.lastInteractionAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleLifecycle(l.id, 'Qualified')}
                        className="rounded border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800">Qualify</button>
                      <button onClick={() => handleLifecycle(l.id, 'Lost')}
                        className="rounded border border-red-500/30 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10">Lost</button>
                      <Link href={`/${slug}/admin/leads/${l.id}`}
                        className="rounded border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800">View</Link>
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
            className="rounded border border-zinc-700 px-3 py-1 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">Previous</button>
          <span className="text-sm text-zinc-400">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="rounded border border-zinc-700 px-3 py-1 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
