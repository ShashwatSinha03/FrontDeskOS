'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getDashboard, updateLeadLifecycle, updateAppointmentStatus, resolveEscalation } from '@/lib/api/ops';
import { ActivityFeed } from '@/components/admin/activity-feed';
import { AttentionRequired } from '@/components/admin/attention-required';
import { Loader } from '@/components/ui/loader';

export default function AdminDashboardPage() {
  const params = useParams();
  const slug = params.businessSlug as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    setLoading(true);
    setError('');
    const res = await getDashboard();
    if (res.success) setData(res.data);
    else setError(res.error || 'Failed to load');
    setLoading(false);
  }

  async function handleLeadLifecycle(id: string, state: string) {
    setError('');
    setMsg('');
    const res = await updateLeadLifecycle(id, state);
    if (res.success) { setMsg('Lead updated.'); loadDashboard(); }
    else setError(res.error || 'Failed');
  }

  async function handleApptStatus(id: string, status: string) {
    setError('');
    setMsg('');
    const res = await updateAppointmentStatus(id, status);
    if (res.success) { setMsg(`Appointment ${status}.`); loadDashboard(); }
    else setError(res.error || 'Failed');
  }

  async function handleResolve(id: string) {
    setError('');
    setMsg('');
    const res = await resolveEscalation(id, resolveNote);
    if (res.success) { setMsg('Escalation resolved.'); setResolveId(null); setResolveNote(''); loadDashboard(); }
    else setError(res.error || 'Failed');
  }

  const funnel = data?.leadFunnel;
  const funnelTotal = funnel ? funnel.new + funnel.contacted + funnel.qualified + funnel.won : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">What needs attention today.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}
      {msg && (
        <div className="rounded-md border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">{msg}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader size={40} color="#a3a3a3" />
        </div>
      ) : (
        <>
          {funnel && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'New', value: funnel.new, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                { label: 'Contacted', value: funnel.contacted, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
                { label: 'Qualified', value: funnel.qualified, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
                { label: 'Won', value: funnel.won, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
              ].map((item) => (
                <div key={item.label} className="product-card p-4">
                  <p className="text-xs text-zinc-400">{item.label}</p>
                  <p className={`mt-1.5 text-2xl font-bold tracking-tight text-white`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <AttentionRequired />
            </div>
            <div className="md:col-span-2 space-y-4">
            <div className="product-card">
              <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-white">Today&apos;s Appointments</h2>
                <span className="text-xs text-zinc-400">View all</span>
              </div>
              <div className="p-4">
                {data?.todayAppointments?.length === 0 ? (
                  <p className="text-sm text-zinc-400">No appointments today.</p>
                ) : (
                  <div className="space-y-2">
                    {data?.todayAppointments?.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-zinc-800/60 p-2.5 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{a.customerName || 'Unknown'}</p>
                          <p className="text-xs text-zinc-400">
                            {new Date(a.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {a.serviceName ? ` · ${a.serviceName}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {a.status === 'pending' && (
                            <>
                              <button onClick={() => handleApptStatus(a.id, 'confirmed')}
                                className="rounded border border-green-500/30 px-2 py-1 text-xs font-medium text-green-400 hover:bg-green-500/10">Confirm</button>
                              <button onClick={() => handleApptStatus(a.id, 'cancelled')}
                                className="rounded border border-red-500/30 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10">Cancel</button>
                            </>
                          )}
                          {a.status === 'confirmed' && (
                            <>
                              <button onClick={() => handleApptStatus(a.id, 'completed')}
                                className="rounded border border-green-500/30 px-2 py-1 text-xs font-medium text-green-400 hover:bg-green-500/10">Complete</button>
                              <button onClick={() => handleApptStatus(a.id, 'cancelled')}
                                className="rounded border border-red-500/30 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10">Cancel</button>
                            </>
                          )}
                          {a.status === 'completed' && (
                            <span className="text-xs text-zinc-400">Completed</span>
                          )}
                          {a.status === 'cancelled' && (
                            <span className="text-xs text-red-400">Cancelled</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="product-card">
              <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-white">Open Leads</h2>
                <span className="text-xs text-zinc-400">View all</span>
              </div>
              <div className="p-4">
                {data?.openLeads?.length === 0 ? (
                  <p className="text-sm text-zinc-400">No open leads.</p>
                ) : (
                  <div className="space-y-2">
                    {data?.openLeads?.map((l: any) => (
                      <div key={l.id} className="rounded-md border border-zinc-800/60 p-2.5 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-white truncate block">
                              {l.name || 'Unknown'}
                            </span>
                            <p className="text-xs text-zinc-400">{l.phone || l.email || ''}</p>
                          </div>
                          <span className="shrink-0 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
                            {l.lifecycleState}
                          </span>
                        </div>
                        <div className="mt-1.5 flex gap-1">
                          <button onClick={() => handleLeadLifecycle(l.id, 'Qualified')}
                            className="rounded border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800">Qualify</button>
                          <button onClick={() => handleLeadLifecycle(l.id, 'Lost')}
                            className="rounded border border-red-500/30 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10">Lost</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="product-card">
              <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-white">Pending Escalations</h2>
                <span className="text-xs text-zinc-400">View all</span>
              </div>
              <div className="p-4">
                {data?.pendingEscalations?.length === 0 ? (
                  <p className="text-sm text-zinc-400">No pending escalations.</p>
                ) : (
                  <div className="space-y-2">
                    {data?.pendingEscalations?.map((e: any) => (
                      <div key={e.id} className="rounded-md border border-zinc-800/60 p-2.5 text-sm">
                        <p className="font-medium text-white">{e.customerName || 'Unknown'}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{e.reason}</p>
                        {resolveId === e.id ? (
                          <div className="mt-2 space-y-1">
                            <input type="text" value={resolveNote} onChange={(e) => setResolveNote(e.target.value)}
                              placeholder="Resolution note (optional)" className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white placeholder-zinc-500" />
                            <div className="flex gap-1">
                              <button onClick={() => handleResolve(e.id)}
                                className="rounded bg-blue-600/80 px-2 py-1 text-xs font-medium text-white hover:bg-blue-500/80">Resolve</button>
                              <button onClick={() => { setResolveId(null); setResolveNote(''); }}
                                className="rounded border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setResolveId(e.id)}
                            className="mt-1 rounded border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800">Resolve</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="product-card">
              <div className="px-4 py-3 border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
              </div>
              <div className="p-4">
                <ActivityFeed activities={data?.recentActivity || []} loading={false} />
              </div>
            </div>
          </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={`/${slug}/admin/leads`} className="rounded-md bg-blue-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500/80 transition-colors">
              View Leads
            </Link>
            <Link href={`/${slug}/admin/appointments`} className="rounded-md bg-blue-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500/80 transition-colors">
              View Appointments
            </Link>
            <Link href={`/${slug}/admin/settings`} className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors">
              Open Settings
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
