'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchDashboardSummary, fetchPublicBusiness } from '@/lib/api';
import { MetricCard } from '@/components/design/metric-card';
import { CardSkeleton } from '@/components/design/skeleton';
import { PageHeader } from '@/components/design/page-header';
import { Users, AlertTriangle, BookOpen, CalendarCheck } from 'lucide-react';

export default function AdminDashboardPage() {
  const params = useParams();
  const slug = params.businessSlug as string;

  const { data: bizData } = useSWR(
    slug ? `admin-biz-${slug}` : null,
    () => fetchPublicBusiness(slug),
    { revalidateOnFocus: false }
  );

  const businessId = bizData?.success && bizData.data ? bizData.data.id : null;

  const { data: summaryData, error, isLoading } = useSWR(
    businessId ? `dashboard-${businessId}` : null,
    () => fetchDashboardSummary(businessId!),
    { revalidateOnFocus: false }
  );

  const summary = summaryData?.success ? summaryData.data : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your business's operations."
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          Failed to load dashboard data.
        </div>
      )}

      {isLoading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total Leads" value={summary?.totalLeads ?? '-'} icon={Users} />
          <MetricCard label="Pending Escalations" value={summary?.pendingEscalations ?? '-'} icon={AlertTriangle} />
          <MetricCard label="Learning Inbox" value={summary?.pendingKnowledgeRequests ?? '-'} icon={BookOpen} />
          <MetricCard label="Appointments Today" value={summary?.appointmentsToday ?? '-'} icon={CalendarCheck} />
        </div>
      )}
    </div>
  );
}
