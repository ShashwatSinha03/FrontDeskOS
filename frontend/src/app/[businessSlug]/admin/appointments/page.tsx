'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getAppointments, updateAppointmentStatus, rescheduleAppointment } from '@/lib/api/ops';
import { EmptyState } from '@/components/design/empty-state';
import { CalendarCheck } from 'lucide-react';

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
        <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
        <p className="mt-1 text-sm text-muted-foreground">{totalCount} appointments.</p>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {msg && <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{msg}</div>}

      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border px-3 py-1.5 text-sm">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
      ) : data.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="No appointments" description="No appointments found for the selected filters." />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Date & Time</th>
                <th className="px-4 py-3 text-left font-medium">Service</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((a: any) => (
                <tr key={a.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{a.customerName || 'Unknown'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(a.appointmentTime).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.serviceName || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      a.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      a.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {a.status === 'pending' && (
                        <>
                          <button onClick={() => handleStatus(a.id, 'confirmed')}
                            className="rounded border border-green-200 px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50">Confirm</button>
                          <button onClick={() => handleStatus(a.id, 'cancelled')}
                            className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Cancel</button>
                        </>
                      )}
                      {a.status === 'confirmed' && (
                        <>
                          <button onClick={() => handleStatus(a.id, 'completed')}
                            className="rounded border border-green-200 px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50">Complete</button>
                          <button onClick={() => setReschedId(a.id)}
                            className="rounded border px-2 py-1 text-xs font-medium hover:bg-muted">Reschedule</button>
                          <button onClick={() => handleStatus(a.id, 'cancelled')}
                            className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Cancel</button>
                        </>
                      )}
                      {a.status === 'completed' && (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                      {a.status === 'cancelled' && (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                    {reschedId === a.id && (
                      <div className="mt-1 flex items-center gap-1">
                        <input type="datetime-local" onChange={(e) => setReschedTime(e.target.value)}
                          className="rounded border px-2 py-1 text-xs flex-1" />
                        <button onClick={() => handleReschedule(a.id)} disabled={!reschedTime}
                          className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">Save</button>
                        <button onClick={() => { setReschedId(null); setReschedTime(''); }}
                          className="rounded border px-2 py-1 text-xs font-medium hover:bg-muted">X</button>
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
            className="rounded border px-3 py-1 text-sm font-medium hover:bg-muted disabled:opacity-50">Previous</button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="rounded border px-3 py-1 text-sm font-medium hover:bg-muted disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
