'use client';

import { useEffect } from 'react';
import { useDemo, useDemoStore } from '@/lib/demo/stores/demo-provider';
import { demoAnalytics } from '@/lib/demo/analytics/demo-analytics';

export default function DemoDashboardPage() {
  const { dashboard, appointments, conversations, costs } = useDemo();
  useEffect(() => { demoAnalytics.track('dashboard_viewed'); }, []);
  const metrics = useDemoStore(dashboard, () => dashboard.metrics);
  const totalCost = useDemoStore(costs, () => costs.totalCost);

  const cards = [
    { label: 'Total Conversations', value: metrics.totalConversations, change: '+12%' },
    { label: 'Active Now', value: metrics.activeConversations, change: '' },
    { label: 'Appointments', value: metrics.totalAppointments, change: '+8%' },
    { label: 'Total Leads', value: metrics.totalLeads, change: '+15%' },
    { label: 'Escalations Pending', value: metrics.escalationsPending, change: '', highlight: metrics.escalationsPending > 0 },
    { label: 'Avg Response Time', value: `${metrics.responseTime}s`, change: '-5%' },
    { label: 'Satisfaction', value: `${metrics.satisfactionRate}%`, change: '+2%' },
    { label: 'Monthly Cost', value: `$${totalCost.toFixed(2)}`, change: '' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard Overview</h1>
      <p className="mt-1 text-sm text-zinc-500">Apex Dental Care — Demo Mode</p>
      <div data-tour="tour-dashboard-metrics" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`product-card p-5 ${
              card.highlight ? 'border-amber-500/30' : ''
            }`}
          >
            <p className="text-sm text-zinc-500">{card.label}</p>
            <p className={`mt-2 text-2xl font-bold ${card.highlight ? 'text-amber-400' : 'text-white'}`}>
              {card.value}
            </p>
            {card.change && <p className="mt-1 text-xs text-green-400">{card.change}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
