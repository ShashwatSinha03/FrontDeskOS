'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { fetchCustomerDetail, fetchPublicBusiness, fetchConversationMessages } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConversationViewer } from '@/components/admin/conversation-viewer';
import { LifecycleEditor } from '@/components/admin/lifecycle-editor';
import { CustomerProfileEditor } from '@/components/admin/customer-profile-editor';
import { BookAppointmentDialog } from '@/components/admin/book-appointment-dialog';
import { DataTable, Column } from '@/components/admin/data-table';
import {
  Phone, Mail, Calendar, Clock, AlertTriangle,
  ArrowRight, MessageSquare, Activity, CalendarPlus,
} from 'lucide-react';

const LIFECYCLE_COLORS: Record<string, string> = {
  'New Inquiry': 'bg-blue-100 text-blue-700 border-blue-200',
  'Information Gathering': 'bg-purple-100 text-purple-700 border-purple-200',
  'Qualified': 'bg-teal-100 text-teal-700 border-teal-200',
  'Booking Opportunity': 'bg-amber-100 text-amber-700 border-amber-200',
  'Booked': 'bg-green-100 text-green-700 border-green-200',
  'Customer': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Follow-Up Pending': 'bg-orange-100 text-orange-700 border-orange-200',
  'Escalated': 'bg-red-100 text-red-700 border-red-200',
  'Lost': 'bg-gray-100 text-gray-700 border-gray-200',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  rescheduled: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  sent: 'bg-green-100 text-green-700',
};

const APPT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  rescheduled: 'bg-blue-100 text-blue-700',
};

const ESCALATION_COLORS: Record<string, string> = {
  pending: 'bg-red-100 text-red-700',
  resolved: 'bg-green-100 text-green-700',
};

const FOLLOWUP_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  sent: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

function ConversationMessages({ conversationId }: { conversationId: string | null }) {
  const { data: msgsData, error, isLoading } = useSWR(
    conversationId ? `conv-msgs-${conversationId}` : null,
    () => fetchConversationMessages(conversationId!),
    { revalidateOnFocus: false }
  );
  const convMessages = msgsData?.success ? (msgsData.data as any[]) || [] : [];

  if (isLoading) return <div className="h-32 rounded bg-muted animate-pulse" />;
  if (error) return <p className="text-sm text-red-500">Failed to load messages.</p>;

  return <ConversationViewer messages={convMessages as any} />;
}

const TABS = ['Overview', 'Timeline', 'Conversations', 'Appointments', 'Escalations', 'Follow-Ups'] as const;

type Tab = typeof TABS[number];

function classifyEscalation(reason: string): { label: string; color: string } {
  const lower = reason.toLowerCase();
  if (lower.includes('emergency') || lower.includes('urgent')) return { label: 'Emergency', color: 'bg-red-100 text-red-700 border-red-300' };
  if (lower.includes('lawsuit') || lower.includes('sue') || lower.includes('attorney') || lower.includes('lawyer') || lower.includes('legal')) return { label: 'Legal', color: 'bg-purple-100 text-purple-700 border-purple-300' };
  if (lower.includes('refund') || lower.includes('chargeback') || lower.includes('compensation')) return { label: 'Refund', color: 'bg-orange-100 text-orange-700 border-orange-300' };
  if (lower.includes('complaint') || lower.includes('bad review') || lower.includes('bbb')) return { label: 'Complaint', color: 'bg-amber-100 text-amber-700 border-amber-300' };
  return { label: 'General', color: 'bg-gray-100 text-gray-700 border-gray-300' };
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
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <AlertTriangle className="h-8 w-8 mx-auto text-red-400 mb-2" />
        <p className="text-sm text-red-600">
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
      <Badge className={APPT_STATUS_COLORS[v] || ''} variant="outline">{v}</Badge>
    )},
    { key: 'notes', label: 'Notes', render: (v: string) => v || '—' },
  ];

  const escColumns: Column[] = [
    { key: 'reason', label: 'Reason', render: (v: string) => {
      const sev = classifyEscalation(v);
      return (
        <div className="flex items-center gap-2">
          <Badge className={sev.color} variant="outline">{sev.label}</Badge>
          <span>{v}</span>
        </div>
      );
    }},
    { key: 'status', label: 'Status', render: (v: string) => (
      <Badge className={ESCALATION_COLORS[v] || ''} variant="outline">{v}</Badge>
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
      <Badge className={FOLLOWUP_STATUS_COLORS[v] || ''} variant="outline">{v}</Badge>
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
                <h1 className="text-2xl font-bold">{customer.name || 'Unnamed Customer'}</h1>
                <Badge className={LIFECYCLE_COLORS[customer.lifecycleState] || ''} variant="outline">
                  {customer.lifecycleState}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {customer.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {customer.email}
                  </span>
                )}
                {customer.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {customer.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Created {new Date(customer.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1.5">
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

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{appointments.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Conversations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{conversations.length}</p>
              <p className="text-xs text-muted-foreground mt-1">{allMessages.length} messages</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Escalations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{escalations.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Follow-Ups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{followUps.length}</p>
            </CardContent>
          </Card>
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
              <div className="flex gap-1 border-b overflow-x-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={`px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                      selectedConversationId === conv.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {conv.channelType.replace('_', ' ')} — {new Date(conv.createdAt).toLocaleDateString()}
                  </button>
                ))}
              </div>

              <ConversationMessages conversationId={selectedConversationId ?? null} />
            </>
          )}
        </div>
      )}

      {activeTab === 'Timeline' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No events yet.</p>
            ) : (
              <div className="relative pl-6 border-l-2 border-gray-200 space-y-4">
                {timeline.map((event, i) => {
                  const typeColors: Record<string, string> = {
                    lead: 'bg-blue-500',
                    activity: 'bg-gray-400',
                    appointment: 'bg-green-500',
                    escalation: 'bg-red-500',
                    followup: 'bg-amber-500',
                    conversation: 'bg-purple-500',
                    lifecycle: 'bg-indigo-500',
                  };
                  return (
                    <div key={i} className="relative">
                      <div className={`absolute -left-[25px] top-1 h-3 w-3 rounded-full ${typeColors[event.type] || 'bg-gray-400'}`} />
                      <p className="text-xs text-muted-foreground">
                        {event.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-sm font-medium">{event.label}</p>
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
            <h2 className="text-lg font-semibold">Appointment History</h2>
            <button
              onClick={() => setShowBookDialog(true)}
              className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
            >
              <CalendarPlus className="h-3.5 w-3.5" /> Book Appointment
            </button>
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
          <h2 className="text-lg font-semibold">Escalations</h2>
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
          <h2 className="text-lg font-semibold">Follow-Ups</h2>
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
