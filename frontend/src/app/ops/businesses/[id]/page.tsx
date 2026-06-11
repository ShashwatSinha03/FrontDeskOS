'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, Copy, Building2, Users, CalendarCheck, AlertTriangle, CreditCard } from 'lucide-react';
import { PageHeader } from '@/components/design/page-header';
import { MetricCard } from '@/components/design/metric-card';
import { StatusBadge } from '@/components/design/status-badge';
import { DataTable } from '@/components/admin/data-table';
import { EmptyState } from '@/components/design/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchBusiness, FounderBusinessDetail, FounderLead, FounderAppointment, FounderEscalation } from '@/lib/founder';

const HEALTH_BADGE: Record<string, 'success' | 'warning' | 'danger'> = {
  healthy: 'success',
  attention: 'warning',
  critical: 'danger',
};

export default function BusinessDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [business, setBusiness] = useState<FounderBusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBusiness(id);
      setBusiness(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Business not found"
        description={error || 'The business could not be loaded.'}
        action={<Link href="/ops/businesses"><Button variant="outline">Back to Businesses</Button></Link>}
      />
    );
  }

  const tenantUrl = `https://frontdeskos.vercel.app/${business.slug}`;
  const adminUrl = `${tenantUrl}/admin`;
  const bookingUrl = `${tenantUrl}/book`;
  const servicesUrl = `${tenantUrl}/services`;

  const leadColumns = [
    { key: 'customerName', label: 'Name', render: (v: string | null) => v || '—' },
    { key: 'email', label: 'Email', render: (v: string | null) => v || '—' },
    { key: 'lifecycleState', label: 'Status', render: (v: string) => <StatusBadge level="info">{v}</StatusBadge> },
    { key: 'createdAt', label: 'Created', render: (v: string) => new Date(v).toLocaleDateString() },
  ];

  const apptColumns = [
    { key: 'customerName', label: 'Customer', render: (v: string | null) => v || '—' },
    { key: 'serviceName', label: 'Service', render: (v: string | null) => v || '—' },
    { key: 'appointmentTime', label: 'Date/Time', render: (v: string) => new Date(v).toLocaleString() },
    { key: 'status', label: 'Status', render: (v: string) => <StatusBadge level="warning">{v}</StatusBadge> },
  ];

  const escColumns = [
    { key: 'customerName', label: 'Customer', render: (v: string | null) => v || '—' },
    { key: 'reason', label: 'Issue', render: (v: string) => (
      <span className="truncate block max-w-xs">{v}</span>
    )},
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Created', render: (v: string) => new Date(v).toLocaleDateString() },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/ops/businesses" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">{business.name}</h1>
          <p className="text-sm text-muted-foreground">/{business.slug}</p>
        </div>
        <StatusBadge level={HEALTH_BADGE[business.health]}>{business.health}</StatusBadge>
        <Link href={`/ops/businesses/${business.id}/edit`}>
          <Button size="sm" variant="outline">Edit</Button>
        </Link>
      </div>

      {/* Links Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Operations Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Website', url: tenantUrl },
              { label: 'Booking', url: bookingUrl },
              { label: 'Admin Dashboard', url: adminUrl },
              { label: 'Services', url: servicesUrl },
            ].map((link) => (
              <div key={link.label} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{link.label}</p>
                  <p className="text-sm truncate font-medium">{link.url.replace('https://frontdeskos.vercel.app/', '')}</p>
                </div>
                <a href={link.url} target="_blank" rel="noopener noreferrer"
                   className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button onClick={() => copy(link.url, link.label)}
                        className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info + Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Leads" value={business.leadCount} icon={Users} />
        <MetricCard label="Appointments" value={business.appointmentCount} icon={CalendarCheck} />
        <MetricCard label="Pending Escalations" value={business.escalationCount} icon={AlertTriangle} />
        <MetricCard label="Services" value={business.serviceCount} icon={Building2} />
      </div>

      {/* Business Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Business Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Industry</dt>
              <dd className="font-medium capitalize">{business.businessType}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-medium">{business.planName || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium truncate">{business.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">{business.phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Timezone</dt>
              <dd className="font-medium">{business.timezone}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-medium">{new Date(business.createdAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">FAQs</dt>
              <dd className="font-medium">{business.faqCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Recent Activity</dt>
              <dd className="font-medium">{business.hasRecentActivity ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Recent Leads */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Recent Leads</h2>
        <DataTable
          columns={leadColumns}
          data={business.recentLeads}
          totalCount={business.recentLeads.length}
          page={1} limit={5}
          onPageChange={() => {}}
        />
      </div>

      {/* Recent Appointments */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Recent Appointments</h2>
        <DataTable
          columns={apptColumns}
          data={business.recentAppointments}
          totalCount={business.recentAppointments.length}
          page={1} limit={5}
          onPageChange={() => {}}
        />
      </div>

      {/* Pending Escalations */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Pending Escalations</h2>
        <DataTable
          columns={escColumns}
          data={business.recentEscalations}
          totalCount={business.recentEscalations.length}
          page={1} limit={5}
          onPageChange={() => {}}
        />
      </div>
    </div>
  );
}
