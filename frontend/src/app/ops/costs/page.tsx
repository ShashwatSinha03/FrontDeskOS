'use client';

import useSWR from 'swr';
import { founderFetcher, founderUrl } from '@/lib/api/founder';

function formatMoney(cents: number): string {
  if (cents < 0.01) return '$0.00';
  return `$${cents.toFixed(2)}`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Bar({ value, max, label, className }: { value: number; max: number; label: string; className?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-right text-sm text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-muted">
        <div className={`h-2 rounded-full transition-all ${className || 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-20 shrink-0 text-right text-sm font-medium tabular-nums">{formatMoney(value)}</span>
    </div>
  );
}

export default function CostsPage() {
  const { data, error, isLoading } = useSWR(
    founderUrl('/ops/costs/summary'),
    founderFetcher,
    { revalidateOnFocus: false, revalidateInterval: 30000 },
  );

  const summary = data?.success ? data.data : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Costs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform usage and infrastructure costs across all businesses.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          Failed to load cost data.
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard
              label="Platform Monthly Cost"
              value={formatMoney(summary.platformMonthlyCost)}
              sub={`${summary.totalBusinesses} business${summary.totalBusinesses === 1 ? '' : 'es'}`}
            />
            <StatCard
              label="LLM Calls"
              value={summary.totalLLMCalls.toLocaleString()}
              sub={`${summary.totalChannelMessages.toLocaleString()} channel messages`}
            />
            <StatCard
              label="Cost / Business"
              value={summary.totalBusinesses > 0 ? formatMoney(summary.platformMonthlyCost / summary.totalBusinesses) : '$0.00'}
              sub="Monthly average"
            />
            <StatCard
              label="LLM Cost Share"
              value={summary.platformMonthlyCost > 0
                ? `${((summary.llmBreakdown?.reduce((a: any, b: any) => a + b.cost, 0) || 0) / summary.platformMonthlyCost * 100).toFixed(1)}%`
                : '0%'}
              sub="vs channel costs"
            />
          </div>

          {summary.llmBreakdown?.length > 0 && (
            <div className="rounded-lg bg-card p-5">
              <h2 className="mb-4 text-sm font-medium">LLM Cost by Provider</h2>
              <div className="space-y-2">
                {summary.llmBreakdown.map((item: any) => (
                  <Bar
                    key={item.provider}
                    label={item.provider}
                    value={item.cost}
                    max={Math.max(...summary.llmBreakdown.map((b: any) => b.cost), 0.01)}
                    className="bg-violet-500"
                  />
                ))}
              </div>
            </div>
          )}

          {summary.channelBreakdown?.length > 0 && (
            <div className="rounded-lg bg-card p-5">
              <h2 className="mb-4 text-sm font-medium">Channel Cost by Type</h2>
              <div className="space-y-2">
                {summary.channelBreakdown.map((item: any) => (
                  <Bar
                    key={item.channelType}
                    label={item.channelType}
                    value={item.cost}
                    max={Math.max(...summary.channelBreakdown.map((b: any) => b.cost), 0.01)}
                    className="bg-emerald-500"
                  />
                ))}
              </div>
            </div>
          )}

          {summary.topBusinesses?.length > 0 && (
            <div className="rounded-lg bg-card">
              <div className="border-b px-5 py-3">
                <h2 className="text-sm font-medium">Top Businesses by Cost</h2>
              </div>
              <div className="divide-y">
                {summary.topBusinesses.map((biz: any, i: number) => (
                  <div key={biz.businessId} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                      <div>
                        <p className="text-sm font-medium">{biz.businessName || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {biz.llmCalls} LLM calls · {biz.channelMessages} messages
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium tabular-nums">{formatMoney(biz.totalCost)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.dailyLLMCosts?.length > 0 && (
            <div className="rounded-lg bg-card p-5">
              <h2 className="mb-4 text-sm font-medium">Daily LLM Cost (Last 30 days)</h2>
              <div className="flex items-end gap-1 h-24">
                {summary.dailyLLMCosts.slice(0, 30).reverse().map((day: any) => {
                  const maxDay = Math.max(...summary.dailyLLMCosts.map((d: any) => d.cost), 0.01);
                  const height = (day.cost / maxDay) * 100;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 rounded-t bg-blue-400/60 hover:bg-blue-400 transition-colors relative group"
                      style={{ height: `${Math.max(height, 1)}%` }}
                      title={`${day.date}: ${formatMoney(day.cost)} (${day.calls} calls)`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
