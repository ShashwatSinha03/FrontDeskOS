'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Users, CalendarCheck, AlertTriangle, CreditCard, DollarSign, ArrowRight, ExternalLink, PlusCircle } from 'lucide-react';
import { PageHeader } from '@/components/design/page-header';
import { MetricCard } from '@/components/design/metric-card';
import { StatusBadge } from '@/components/design/status-badge';
import { DataTable } from '@/components/admin/data-table';
import { EmptyState } from '@/components/design/empty-state';
import { Button } from '@/components/ui/button';
import { fetchOverview, fetchBusinesses, fetchActivity, FounderOverview, FounderBusiness, ActivityEvent } from '@/lib/founder';

const HEALTH_BADGE: Record<string, 'success' | 'warning' | 'danger'> = {
  healthy: 'success',
  attention: 'warning',
  critical: 'danger',
};

export default function FounderOverviewPage() {
  const [overview, setOverview] = useState<FounderOverview | null>(null);
  const [businesses, setBusinesses] = useState<FounderBusiness[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, bizRes, actRes] = await Promise.all([
        fetchOverview(),
        fetchBusinesses({ page: 1, limit: 5 }),
        fetchActivity(8),
      ]);
      setOverview(ovRes.data);
      setBusinesses(bizRes.data);
      setActivity(actRes.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Failed to load overview"
        description={error}
        action={<Button onClick={load}>Retry</Button>}
      />
    );
  }

  const bizColumns = [
    { key: 'name', label: 'Business', render: (_: any, row: FounderBusiness) => (
      <Link href={`/ops/businesses/${row.id}`} className="font-medium hover:text-primary transition-colors">
        {row.name}
      </Link>
    )},
    { key: 'health', label: 'Health', render: (v: string) => (
      <StatusBadge level={HEALTH_BADGE[v] || 'neutral'}>{v}</StatusBadge>
    )},
    { key: 'planName', label: 'Plan', render: (v: string | null) => v || '—' },
    { key: 'leadCount', label: 'Leads' },
    { key: 'appointmentCount', label: 'Appts' },
    { key: 'escalationCount', label: 'Esc' },
    { key: 'createdAt', label: 'Created', render: (v: string) => new Date(v).toLocaleDateString() },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Founder OS" description="Command center for FrontDeskOS operations." />

      {/* Metric Cards */}
      {overview && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Total Businesses" value={overview.totalBusinesses} icon={Building2} />
          <MetricCard label="Active Businesses" value={overview.activeBusinesses} icon={Building2} />
          <MetricCard label="Leads Today" value={overview.leadsToday} icon={Users} />
          <MetricCard label="Appointments Today" value={overview.appointmentsToday} icon={CalendarCheck} />
          <MetricCard label="Pending Escalations" value={overview.pendingEscalations} icon={AlertTriangle} />
          <MetricCard
            label="Monthly Revenue"
            value={`₹${overview.monthlyRevenue.toLocaleString('en-IN')}`}
            icon={DollarSign}
          />
        </div>
      )}

      {/* Health Summary */}
      {overview && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            {overview.businessesByHealth.healthy} healthy
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            {overview.businessesByHealth.attention} attention
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            {overview.businessesByHealth.critical} critical
          </span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/ops/onboarding">
            <Button size="sm"><PlusCircle className="h-3.5 w-3.5" /> Launch Onboarding</Button>
          </Link>
          <Link href="/ops/businesses">
            <Button size="sm" variant="outline"><Building2 className="h-3.5 w-3.5" /> View Businesses</Button>
          </Link>
          <Link href="/ops/escalations">
            <Button size="sm" variant="outline"><AlertTriangle className="h-3.5 w-3.5" /> View Escalations</Button>
          </Link>
          <Link href="/ops/leads">
            <Button size="sm" variant="outline"><Users className="h-3.5 w-3.5" /> View Leads</Button>
          </Link>
          <Link href="/ops/appointments">
            <Button size="sm" variant="outline"><CalendarCheck className="h-3.5 w-3.5" /> View Appointments</Button>
          </Link>
        </div>
      </div>

      {/* Recent Businesses & Activity Feed */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Businesses */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Businesses</h2>
            <Link href="/ops/businesses" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <DataTable
            columns={bizColumns}
            data={businesses}
            totalCount={businesses.length}
            page={1}
            limit={5}
            onPageChange={() => {}}
            isLoading={loading}
          />
        </div>

        {/* Activity Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Activity</h2>
            <Link href="/ops/activity" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <div className="space-y-2">
              {activity.map((event, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/ops/businesses/${event.businessId}`}
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {event.businessName}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">{event.summary}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(event.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
