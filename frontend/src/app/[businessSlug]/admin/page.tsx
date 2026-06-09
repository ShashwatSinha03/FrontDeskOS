'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchDashboardSummary, fetchPublicBusiness } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  const cards = [
    {
      title: 'Total Leads',
      value: summary?.totalLeads ?? '-',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Pending Escalations',
      value: summary?.pendingEscalations ?? '-',
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      title: 'Learning Inbox',
      value: summary?.pendingKnowledgeRequests ?? '-',
      icon: BookOpen,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Appointments Today',
      value: summary?.appointmentsToday ?? '-',
      icon: CalendarCheck,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your clinic&apos;s operations.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          Failed to load dashboard data.
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-4 w-20 rounded bg-muted animate-pulse mb-2" />
                <div className="h-8 w-12 rounded bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${card.bg}`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  </div>
                  <p className="mt-3 text-3xl font-bold">{card.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
