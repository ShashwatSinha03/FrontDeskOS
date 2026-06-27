'use client';

import { useDemo, useDemoStore } from '@/lib/demo/stores/demo-provider';
import { MessageSquare, TrendingUp, Users, CalendarCheck } from 'lucide-react';

export default function DemoAnalyticsPage() {
  const { analytics } = useDemo();
  const metrics = useDemoStore(analytics, () => analytics.metrics);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Analytics</h1>
      <p className="mt-1 text-sm text-zinc-500">Last 30 days · Demo Mode</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 text-zinc-500">
            <MessageSquare className="h-4 w-4 text-blue-400" />
            <span className="text-sm">Conversations</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{metrics.totalConversations}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 text-zinc-500">
            <CalendarCheck className="h-4 w-4 text-green-400" />
            <span className="text-sm">Appointments</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{metrics.totalAppointments}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 text-zinc-500">
            <Users className="h-4 w-4 text-purple-400" />
            <span className="text-sm">Leads</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{metrics.totalLeads}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 text-zinc-500">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <span className="text-sm">Satisfaction</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{metrics.satisfactionAvg}%</p>
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-white">Daily Volume (Last 30 Days)</h2>
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-end gap-1" style={{ height: 120 }}>
          {metrics.dailyVolume.map((day, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-blue-600/60 hover:bg-blue-500"
              style={{ height: `${(day.conversations / 25) * 100}%`, minHeight: 4 }}
              title={`${day.date}: ${day.conversations} conversations`}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-zinc-600">
          <span>{metrics.dailyVolume[0]?.date}</span>
          <span>{metrics.dailyVolume[metrics.dailyVolume.length - 1]?.date}</span>
        </div>
      </div>
    </div>
  );
}
