'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { fetchCustomerDetail, fetchPublicBusiness, fetchConversationMessages } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, lifecycleLevel, statusLevel } from '@/components/design/status-badge';
import { MetricCard } from '@/components/design/metric-card';
import { TabBar } from '@/components/design/tab-bar';
import { ConversationViewer } from '@/components/admin/conversation-viewer';
import { LifecycleEditor } from '@/components/admin/lifecycle-editor';
import { CustomerProfileEditor } from '@/components/admin/customer-profile-editor';
import { BookAppointmentDialog } from '@/components/admin/book-appointment-dialog';
import { DataTable, Column } from '@/components/admin/data-table';
import {
  Phone, Mail, Calendar, Clock, AlertTriangle, CalendarDays,
  MessageSquare, Activity, CalendarPlus,
} from 'lucide-react';

function ConversationMessages({ conversationId }: { conversationId: string | null }) {
  const { data: msgsData, error, isLoading } = useSWR(
    conversationId ? `conv-msgs-${conversationId}` : null,
    () => fetchConversationMessages(conversationId!),
    { revalidateOnFocus: false }
  );
  const convMessages = msgsData?.success ? (msgsData.data as any[]) || [] : [];

  if (isLoading) return <div className="h-32 rounded-lg bg-card bg-muted/30 animate-pulse" />;
  if (error) return <p className="text-sm text-red-500">Failed to load messages.</p>;

  return <ConversationViewer messages={convMessages as any} />;
}

const TABS = ['Overview', 'Timeline', 'Conversations', 'Appointments', 'Escalations', 'Follow-Ups'] as const;

type Tab = typeof TABS[number];

function classifyEscalation(reason: string): { label: string; level: 'danger' | 'purple' | 'orange' | 'warning' | 'neutral' } {
  const lower = reason.toLowerCase();
  if (lower.includes('emergency') || lower.includes('urgent')) return { label: 'Emergency', level: 'danger' };
  if (lower.includes('lawsuit') || lower.includes('sue') || lower.includes('attorney') || lower.includes('lawyer') || lower.includes('legal')) return { label: 'Legal', level: 'purple' };
  if (lower.includes('refund') || lower.includes('chargeback') || lower.includes('compensation')) return { label: 'Refund', level: 'orange' };
  if (lower.includes('complaint') || lower.includes('bad review') || lower.includes('bbb')) return { label: 'Complaint', level: 'warning' };
  return { label: 'General', level: 'neutral' };
}

function buildTimeline(
  customer: any,
  appointments: any[],
  escalations: any[],
  followUps: any[],
  conversations: any[],
  messages: any[],
  lifecycleEvents: any[]
) {
  const events: { date: Date; label: string; type: string }[] = [];

  events.push({ date: new Date(customer.createdAt), label: 'Lead Created', type: 'lead' });

  if (customer.lastInteractionAt && customer.lastInteractionAt !== customer.createdAt) {
    events.push({ date: new Date(customer.lastInteractionAt), label: 'Last Interaction', type: 'activity' });
  }

  for (const a of appointments) {
    events.push({ date: new Date(a.appointmentTime), label: `Appointment: ${a.serviceName || 'Booking'}`, type: 'appointment' });
    if (a.createdAt && new Date(a.createdAt) < new Date(a.appointmentTime)) {
      events.push({ date: new Date(a.createdAt), label: `Booked ${a.serviceName || 'Appointment'}`, type: 'appointment' });
    }
  }

  for (const e of escalations) {
    events.push({ date: new Date(e.createdAt), label: 'Escalation Created', type: 'escalation' });
  }

  for (const f of followUps) {
    events.push({ date: new Date(f.scheduledAt), label: `Follow-Up: ${f.type}`, type: 'followup' });
  }

  for (const c of conversations) {
    events.push({ date: new Date(c.createdAt), label: 'Conversation Started', type: 'conversation' });
  }

  for (const ev of lifecycleEvents) {
    const prev = ev.previousState || '—';
    const label = ev.triggerEvent === 'new_inquiry_created'
      ? 'Lead Created'
      : `Lifecycle: ${prev} → ${ev.newState}`;
    events.push({ date: new Date(ev.createdAt), label, type: 'lifecycle' });
  }

  events.sort((a, b) => b.date.getTime() - a.date.getTime());
  return events;
}

export function CustomerDetail({ customerId }: { customerId: string }) {
  const params = useParams();
  const slug = params.businessSlug as string;
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null | undefined>(undefined);
  const [showBookDialog, setShowBookDialog] = useState(false);

  const cacheKey = `customer-detail-${customerId}`;

  const { data: bizData } = useSWR(slug ? `cd-biz-${slug}` : null, () =>
    fetchPublicBusiness(slug), { revalidateOnFocus: false }
  );
  const businessId = bizData?.success && bizData.data ? bizData.data.id : null;

  const { data, error, isLoading } = useSWR(
    businessId ? cacheKey : null,
    () => fetchCustomerDetail(customerId, businessId!),
    { revalidateOnFocus: false }
  );

  const detail = data?.success ? data.data : null;

  const handleRefresh = () => {
    mutate(cacheKey);
  };

  const conversations = detail?.conversations || [];

  useEffect(() => {
    if (activeTab === 'Conversations' && selectedConversationId === undefined && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [activeTab, selectedConversationId, conversations]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-card p-5">
              <div className="h-4 w-24 rounded bg-muted animate-pulse mb-3" />
              <div className="h-8 w-16 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-64 rounded-xl border bg-muted/30 animate-pulse" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertTriangle className="h-8 w-8 mx-auto text-red-400 mb-3" />
        <p className="text-sm font-medium text-red-600">
          {error ? 'Failed to load customer details.' : 'Customer not found.'}
        </p>
      </div>
    );
  }

  const { customer, appointments, escalations, followUps, lifecycleEvents } = detail;
  const allMessages = detail.messages || [];

  const timeline = buildTimeline(customer, appointments, escalations, followUps, conversations, allMessages, lifecycleEvents);

  const apptColumns: Column[] = [
    { key: 'serviceName', label: 'Service', render: (v: string) => v || '—' },
    { key: 'appointmentTime', label: 'Date & Time', render: (v: string) => v ? new Date(v).toLocaleString() : '—' },
    { key: 'status', label: 'Status', render: (v: string) => (
      <StatusBadge level={statusLevel(v)}>{v}</StatusBadge>
    )},
    { key: 'notes', label: 'Notes', render: (v: string) => v || '—' },
  ];

  const escColumns: Column[] = [
    { key: 'reason', label: 'Reason', render: (v: string) => {
      const sev = classifyEscalation(v);
      return (
        <div className="flex items-center gap-2">
          <StatusBadge level={sev.level}>{sev.label}</StatusBadge>
          <span>{v}</span>
        </div>
      );
    }},
    { key: 'status', label: 'Status', render: (v: string) => (
      <StatusBadge level={statusLevel(v)}>{v}</StatusBadge>
    )},
    { key: 'createdAt', label: 'Created', render: (v: string) => v ? new Date(v).toLocaleString() : '—' },
  ];

  const fuColumns: Column[] = [
    { key: 'type', label: 'Type', render: (v: string) => {
      const labels: Record<string, string> = { re_engagement: 'Re-engagement', day_1: 'Day 1', day_3: 'Day 3', missed_call: 'Missed Call' };
      return labels[v] || v;
    }},
    { key: 'scheduledAt', label: 'Scheduled', render: (v: string) => v ? new Date(v).toLocaleString() : '—' },
    { key: 'status', label: 'Status', render: (v: string) => (
      <StatusBadge level={statusLevel(v)}>{v}</StatusBadge>
    )},
    { key: 'triggerReason', label: 'Reason', render: (v: string) => v || '—' },
  ];

  return (
    <div className="space-y-6">
      {/* Customer Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold tracking-tight">{customer.name || 'Unnamed Customer'}</h1>
                <StatusBadge level={lifecycleLevel(customer.lifecycleState)}>
                  {customer.lifecycleState}
                </StatusBadge>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                {customer.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {customer.email}
                  </span>
                )}
                {customer.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {customer.phone}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Created {new Date(customer.createdAt).toLocaleDateString()}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Last interaction {new Date(customer.lastInteractionAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-end gap-2">
              <LifecycleEditor
                customerId={customer.id}
                currentState={customer.lifecycleState}
                onStateChange={handleRefresh}
              />
              <CustomerProfileEditor
                customerId={customer.id}
                name={customer.name}
                email={customer.email}
                phone={customer.phone}
                onSave={handleRefresh}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <TabBar
        tabs={TABS.map((t) => ({ label: t, value: t }))}
        activeTab={activeTab}
        onTabChange={(v) => setActiveTab(v as Tab)}
      />

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Appointments" value={appointments.length} icon={CalendarDays} />
          <MetricCard label="Conversations" value={conversations.length} icon={MessageSquare} />
          <MetricCard label="Escalations" value={escalations.length} icon={AlertTriangle} />
          <MetricCard label="Follow-Ups" value={followUps.length} icon={Activity} />
        </div>
      )}

      {activeTab === 'Conversations' && (
        <div className="space-y-4">
          {conversations.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center py-4">No conversations yet.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <TabBar
                tabs={conversations.map((conv) => ({
                  label: `${conv.channelType.replace('_', ' ')} — ${new Date(conv.createdAt).toLocaleDateString()}`,
                  value: conv.id,
                }))}
                activeTab={selectedConversationId ?? ''}
                onTabChange={(v) => setSelectedConversationId(v)}
                size="sm"
              />

              <ConversationMessages conversationId={selectedConversationId ?? null} />
            </>
          )}
        </div>
      )}

      {activeTab === 'Timeline' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No events yet.</p>
            ) : (
              <div className="relative pl-6 border-l-2 border-border space-y-5">
                {timeline.map((event, i) => {
                  const typeDot: Record<string, string> = {
                    lead: 'bg-blue-500',
                    activity: 'bg-zinc-400',
                    appointment: 'bg-green-500',
                    escalation: 'bg-red-500',
                    followup: 'bg-amber-500',
                    conversation: 'bg-purple-500',
                    lifecycle: 'bg-indigo-500',
                  };
                  return (
                    <div key={i} className="relative">
                      <div className={`absolute -left-[25px] top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background ${typeDot[event.type] || 'bg-zinc-400'}`} />
                      <p className="text-xs text-muted-foreground">
                        {event.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-sm font-medium mt-0.5">{event.label}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'Appointments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Appointment History</h2>
            <Button size="sm" onClick={() => setShowBookDialog(true)}>
              <CalendarPlus className="h-3.5 w-3.5" /> Book Appointment
            </Button>
          </div>
          <DataTable
            columns={apptColumns}
            data={appointments}
            totalCount={appointments.length}
            page={1}
            limit={100}
            onPageChange={() => {}}
            emptyMessage="No appointments for this customer."
          />
          <BookAppointmentDialog
            customerId={customer.id}
            open={showBookDialog}
            onClose={() => setShowBookDialog(false)}
            onSuccess={handleRefresh}
          />
        </div>
      )}

      {activeTab === 'Escalations' && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold">Escalations</h2>
          <DataTable
            columns={escColumns}
            data={escalations}
            totalCount={escalations.length}
            page={1}
            limit={100}
            onPageChange={() => {}}
            emptyMessage="No escalations for this customer."
          />
        </div>
      )}

      {activeTab === 'Follow-Ups' && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold">Follow-Ups</h2>
          <DataTable
            columns={fuColumns}
            data={followUps}
            totalCount={followUps.length}
            page={1}
            limit={100}
            onPageChange={() => {}}
            emptyMessage="No follow-ups for this customer."
          />
        </div>
      )}
    </div>
  );
}
