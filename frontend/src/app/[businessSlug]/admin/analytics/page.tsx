'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getAnalyticsOverview, getAnalyticsServices, getAnalyticsTrends, getAnalyticsFunnel } from '@/lib/api/analytics';
import { Loader } from '@/components/ui/loader';

function MiniLineChart({ data, dataKey, color }: { data: any[]; dataKey: string; color: string }) {
  if (data.length === 0) return <div className="h-24 flex items-center justify-center text-xs text-zinc-400">No data</div>;
  const values = data.map((d) => d[dataKey] ?? 0);
  const max = Math.max(...values, 1);
  const w = 280;
  const h = 80;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * h}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
      {values.map((v, i) => (
        <circle key={i} cx={(i / (values.length - 1)) * w} cy={h - (v / max) * h} r="2" fill={color} />
      ))}
    </svg>
  );
}

export default function AnalyticsPage() {
  const params = useParams();
  const slug = params.businessSlug as string;
  const [overview, setOverview] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getAnalyticsOverview().then((r) => { if (r.success) setOverview(r.data); }),
      getAnalyticsServices().then((r) => { if (r.success) setServices(r.data); }),
      getAnalyticsTrends().then((r) => { if (r.success) setTrends(r.data); }),
      getAnalyticsFunnel().then((r) => { if (r.success) setFunnel(r.data); }),
    ]).catch(() => setError('Failed to load analytics')).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size={40} color="#a3a3a3" />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>;
  }

  const o = overview;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Analytics</h1>
        <p className="mt-1 text-sm text-zinc-400">Business performance at a glance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="product-card p-5">
          <p className="text-xs text-zinc-400">Leads</p>
          <p className="mt-1 text-2xl font-semibold text-white">{o?.leads?.total ?? 0}</p>
        </div>
        <div className="product-card p-5">
          <p className="text-xs text-zinc-400">Appointments</p>
          <p className="mt-1 text-2xl font-semibold text-white">{o?.appointments?.total ?? 0}</p>
        </div>
        <div className="product-card p-5">
          <p className="text-xs text-zinc-400">Conversion Rate</p>
          <p className="mt-1 text-2xl font-semibold text-white">{o?.leads?.conversionRate ?? 0}%</p>
        </div>
        <div className="product-card p-5">
          <p className="text-xs text-zinc-400">Completion Rate</p>
          <p className="mt-1 text-2xl font-semibold text-white">{o?.appointments?.completionRate ?? 0}%</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="product-card">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-white">Lead Funnel</h2>
          </div>
          <div className="p-4 space-y-3">
            {funnel && [
              { label: 'New Inquiry', value: funnel.new, pct: funnel.new > 0 ? Math.round((funnel.new / (funnel.new + funnel.contacted + funnel.qualified + funnel.won + funnel.lost)) * 100) : 0, bar: 'bg-blue-500' },
              { label: 'Contacted', value: funnel.contacted, pct: funnel.contacted > 0 ? Math.round((funnel.contacted / (funnel.new + funnel.contacted + funnel.qualified + funnel.won + funnel.lost)) * 100) : 0, bar: 'bg-yellow-500' },
              { label: 'Qualified', value: funnel.qualified, pct: funnel.qualified > 0 ? Math.round((funnel.qualified / (funnel.new + funnel.contacted + funnel.qualified + funnel.won + funnel.lost)) * 100) : 0, bar: 'bg-purple-500' },
              { label: 'Won', value: funnel.won, pct: funnel.won > 0 ? Math.round((funnel.won / (funnel.new + funnel.contacted + funnel.qualified + funnel.won + funnel.lost)) * 100) : 0, bar: 'bg-green-500' },
              { label: 'Lost', value: funnel.lost, pct: funnel.lost > 0 ? Math.round((funnel.lost / (funnel.new + funnel.contacted + funnel.qualified + funnel.won + funnel.lost)) * 100) : 0, bar: 'bg-red-500' },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{item.label}</span>
                  <span className="font-medium text-white">{item.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className={`h-full rounded-full ${item.bar} transition-all`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="product-card">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-white">Service Leaderboard</h2>
          </div>
          <div className="p-4">
            {services.length === 0 ? (
              <p className="text-sm text-zinc-400">No service data yet.</p>
            ) : (
              <div className="space-y-2">
                {services.map((s: any, i: number) => (
                  <div key={s.service_id} className="flex items-center justify-between rounded-md border border-zinc-800/60 p-2.5 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 w-5 text-xs font-medium text-zinc-500">#{i + 1}</span>
                      <span className="font-medium text-white truncate">{s.service_name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-zinc-400">{s.bookings} bookings</span>
                      <span className="text-xs text-green-400">{s.completed}</span>
                      <span className="text-xs text-red-400">{s.cancelled}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="product-card">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-white">Trends (30 days)</h2>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-4 text-xs text-zinc-400 mb-2">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Leads</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Appointments</span>
            </div>
            <MiniLineChart data={trends} dataKey="leads" color="#3b82f6" />
            <MiniLineChart data={trends} dataKey="appointments" color="#22c55e" />
          </div>
        </div>

        <div className="product-card">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-white">Escalation Health</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Escalations</p>
                <p className="text-2xl font-semibold text-white">{o?.escalations?.total ?? 0}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-zinc-400">Resolved</p>
                <p className="text-2xl font-semibold text-green-400">{o?.escalations?.resolved ?? 0}</p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-zinc-400">Resolution Rate</span>
                <span className="font-medium text-white">{o?.escalations?.resolutionRate ?? 0}%</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${o?.escalations?.resolutionRate ?? 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
