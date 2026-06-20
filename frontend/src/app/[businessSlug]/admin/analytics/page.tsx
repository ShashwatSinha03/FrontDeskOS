'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getAnalyticsOverview, getAnalyticsServices, getAnalyticsTrends, getAnalyticsFunnel } from '@/lib/api/analytics';

function MiniLineChart({ data, dataKey, color }: { data: any[]; dataKey: string; color: string }) {
  if (data.length === 0) return <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">No data</div>;
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
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />)}</div>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>;
  }

  const o = overview;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Business performance at a glance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-card p-4">
          <p className="text-xs text-muted-foreground">Leads</p>
          <p className="mt-1 text-2xl font-semibold">{o?.leads?.total ?? 0}</p>
        </div>
        <div className="rounded-lg bg-card p-4">
          <p className="text-xs text-muted-foreground">Appointments</p>
          <p className="mt-1 text-2xl font-semibold">{o?.appointments?.total ?? 0}</p>
        </div>
        <div className="rounded-lg bg-card p-4">
          <p className="text-xs text-muted-foreground">Conversion Rate</p>
          <p className="mt-1 text-2xl font-semibold">{o?.leads?.conversionRate ?? 0}%</p>
        </div>
        <div className="rounded-lg bg-card p-4">
          <p className="text-xs text-muted-foreground">Completion Rate</p>
          <p className="mt-1 text-2xl font-semibold">{o?.appointments?.completionRate ?? 0}%</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-card">
          <div className="px-4 py-3">
            <h2 className="text-sm font-semibold">Lead Funnel</h2>
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
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${item.bar} transition-all`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-card">
          <div className="px-4 py-3">
            <h2 className="text-sm font-semibold">Service Leaderboard</h2>
          </div>
          <div className="p-4">
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">No service data yet.</p>
            ) : (
              <div className="space-y-2">
                {services.map((s: any, i: number) => (
                  <div key={s.service_id} className="flex items-center justify-between rounded-md border p-2.5 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 w-5 text-xs font-medium text-muted-foreground">#{i + 1}</span>
                      <span className="font-medium truncate">{s.service_name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">{s.bookings} bookings</span>
                      <span className="text-xs text-green-600">{s.completed}</span>
                      <span className="text-xs text-red-600">{s.cancelled}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-card">
          <div className="px-4 py-3">
            <h2 className="text-sm font-semibold">Trends (30 days)</h2>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Leads</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Appointments</span>
            </div>
            <MiniLineChart data={trends} dataKey="leads" color="#3b82f6" />
            <MiniLineChart data={trends} dataKey="appointments" color="#22c55e" />
          </div>
        </div>

        <div className="rounded-lg bg-card">
          <div className="px-4 py-3">
            <h2 className="text-sm font-semibold">Escalation Health</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Escalations</p>
                <p className="text-2xl font-semibold">{o?.escalations?.total ?? 0}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-semibold text-green-600">{o?.escalations?.resolved ?? 0}</p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Resolution Rate</span>
                <span className="font-medium">{o?.escalations?.resolutionRate ?? 0}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${o?.escalations?.resolutionRate ?? 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
