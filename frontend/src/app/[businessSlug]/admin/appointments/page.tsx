'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getAppointments, updateAppointmentStatus, rescheduleAppointment } from '@/lib/api/ops';
import { EmptyState } from '@/components/design/empty-state';
import { CalendarCheck } from 'lucide-react';
import { Loader } from '@/components/ui/loader';

export default function AppointmentsPage() {
  const params = useParams();
  const slug = params.businessSlug as string;
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [reschedId, setReschedId] = useState<string | null>(null);
  const [reschedTime, setReschedTime] = useState('');
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getAppointments({ status: statusFilter, page, limit });
    if (res.success) { setData(res.data); setTotalCount(res.meta?.totalCount ?? 0); }
    else setError(res.error || 'Failed to load');
    setLoading(false);
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  async function handleStatus(id: string, status: string) {
    setMsg('');
    setError('');
    const res = await updateAppointmentStatus(id, status);
    if (res.success) { setMsg(`Appointment ${status}.`); load(); }
    else setError(res.error || 'Failed');
  }

  async function handleReschedule(id: string) {
    if (!reschedTime) return;
    setMsg('');
    setError('');
    const res = await rescheduleAppointment(id, new Date(reschedTime).toISOString());
    if (res.success) { setMsg('Appointment rescheduled.'); setReschedId(null); setReschedTime(''); load(); }
    else setError(res.error || 'Failed');
  }

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Appointments</h1>
        <p className="mt-1 text-sm text-zinc-400">{totalCount} appointments.</p>
      </div>

      {error && <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
      {msg && <div className="rounded-md border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">{msg}</div>}

      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]"><Loader size={40} color="#a3a3a3" /></div>
      ) : data.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="No appointments" description="No appointments found for the selected filters." />
      ) : (
        <div className="overflow-x-auto product-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-black/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Date & Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Service</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {data.map((a: any) => (
                <tr key={a.id} className="hover:bg-zinc-800/30 transition-colors duration-150">
                  <td className="px-4 py-3 text-sm font-medium text-white">{a.customerName || 'Unknown'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {new Date(a.appointmentTime).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{a.serviceName || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      a.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      a.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {a.status === 'pending' && (
                        <>
                          <button onClick={() => handleStatus(a.id, 'confirmed')}
                            className="rounded border border-green-500/30 px-2 py-1 text-xs font-medium text-green-400 hover:bg-green-500/10">Confirm</button>
                          <button onClick={() => handleStatus(a.id, 'cancelled')}
                            className="rounded border border-red-500/30 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10">Cancel</button>
                        </>
                      )}
                      {a.status === 'confirmed' && (
                        <>
                          <button onClick={() => handleStatus(a.id, 'completed')}
                            className="rounded border border-green-500/30 px-2 py-1 text-xs font-medium text-green-400 hover:bg-green-500/10">Complete</button>
                          <button onClick={() => setReschedId(a.id)}
                            className="rounded border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800">Reschedule</button>
                          <button onClick={() => handleStatus(a.id, 'cancelled')}
                            className="rounded border border-red-500/30 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10">Cancel</button>
                        </>
                      )}
                      {a.status === 'completed' && (
                        <span className="text-xs text-zinc-500">-</span>
                      )}
                      {a.status === 'cancelled' && (
                        <span className="text-xs text-zinc-500">-</span>
                      )}
                    </div>
                    {reschedId === a.id && (
                      <div className="mt-1 flex items-center gap-1">
                        <input type="datetime-local" onChange={(e) => setReschedTime(e.target.value)}
                          className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white flex-1" />
                        <button onClick={() => handleReschedule(a.id)} disabled={!reschedTime}
                          className="rounded bg-blue-600/80 px-2 py-1 text-xs font-medium text-white hover:bg-blue-500/80 disabled:opacity-50">Save</button>
                        <button onClick={() => { setReschedId(null); setReschedTime(''); }}
                          className="rounded border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800">X</button>
                      </div>
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
            className="rounded border border-zinc-700 px-3 py-1 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">Previous</button>
          <span className="text-sm text-zinc-400">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="rounded border border-zinc-700 px-3 py-1 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
