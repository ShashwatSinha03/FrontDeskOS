'use client';

import { useDemo, useDemoStore } from '@/lib/demo/stores/demo-provider';
import { DollarSign, TrendingUp, MessageSquare } from 'lucide-react';

export default function DemoCostsPage() {
  const { costs } = useDemo();
  const total = useDemoStore(costs, () => costs.totalCost);
  const llm = useDemoStore(costs, () => costs.llmCost);
  const channel = useDemoStore(costs, () => costs.channelCost);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Cost Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">Monthly usage · Demo Mode</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 text-zinc-500">
            <DollarSign className="h-4 w-4 text-blue-400" />
            <span className="text-sm">Total Cost</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">${total.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 text-zinc-500">
            <TrendingUp className="h-4 w-4 text-purple-400" />
            <span className="text-sm">LLM Cost</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">${llm.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 text-zinc-500">
            <MessageSquare className="h-4 w-4 text-green-400" />
            <span className="text-sm">Channel Cost</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">${channel.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
