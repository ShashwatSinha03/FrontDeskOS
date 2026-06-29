'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getConversationDetail } from '@/lib/api/ops';
import { PageHeader } from '@/components/design/page-header';
import { StatusBadge, statusLevel } from '@/components/design/status-badge';
import { EmptyState } from '@/components/design/empty-state';
import { Skeleton } from '@/components/design/skeleton';
import { ArrowLeft, MessageSquare, Workflow, User, Calendar, Truck, AlertCircle } from 'lucide-react';

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.businessSlug as string;
  const id = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getConversationDetail(id);
    if (res.success) setData(res.data);
    else if (res.statusCode === 404) setData(null);
    else setError(res.error || 'Failed to load conversation');
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="rounded border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Link href={`/${slug}/admin/conversations`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Conversations
        </Link>
        <EmptyState icon={MessageSquare} title="Conversation not found" description="This conversation could not be found or may have been deleted." />
      </div>
    );
  }

  const { conversation, workflow, lead, appointments, deliveries } = data;

  return (
    <div className="space-y-6">
      <Link href={`/${slug}/admin/conversations`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Conversations
      </Link>

      <div className="rounded-xl bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{conversation.customer_name || 'Unknown'}</h2>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span>{conversation.phone || '—'}</span>
              {conversation.email && <span>{conversation.email}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge level={conversation.channel_type === 'WhatsApp' ? 'success' : 'info'}>
              {conversation.channel_type || '—'}
            </StatusBadge>
            {conversation.status && <StatusBadge level={statusLevel(conversation.status)}>{conversation.status}</StatusBadge>}
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <span>Created: {formatDate(conversation.created_at)}</span>
          <span>Updated: {formatDate(conversation.updated_at)}</span>
        </div>
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="h-4 w-4 text-muted-foreground" /> Messages
        </h3>
        {conversation.messages && conversation.messages.length > 0 ? (
          <div className="space-y-2">
            {(conversation.messages as any[]).sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()).map((msg: any, i: number) => (
              <div key={i} className="rounded-lg bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge level={msg.role === 'assistant' || msg.sender === 'agent' ? 'success' : msg.role === 'system' || msg.sender === 'system' ? 'neutral' : 'info'}>
                    {msg.role || msg.sender || 'Unknown'}
                  </StatusBadge>
                  <span className="text-xs text-muted-foreground">{formatDate(msg.created_at)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.content || msg.body || '—'}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No messages in this conversation" className="py-8" />
        )}
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Workflow className="h-4 w-4 text-muted-foreground" /> Workflow State
        </h3>
        {workflow ? (
          <div className="rounded-xl bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Type:</span>
              <span className="text-sm font-medium">{workflow.workflow_type || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">State:</span>
              <StatusBadge level={workflow.workflow_state === 'completed' ? 'success' : workflow.workflow_state === 'booking' ? 'info' : 'warning'}>
                {workflow.workflow_state || '—'}
              </StatusBadge>
            </div>
            {workflow.collectedData && (
              <div>
                <span className="text-sm text-muted-foreground">Collected Data:</span>
                <pre className="mt-1 rounded bg-muted p-3 text-xs overflow-auto">{JSON.stringify(workflow.collectedData, null, 2)}</pre>
              </div>
            )}
            {workflow.lastAskedField && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Last Asked Field:</span>
                <span className="text-sm font-medium">{workflow.lastAskedField}</span>
              </div>
            )}
          </div>
        ) : (
          <EmptyState title="No active workflow" className="py-8" />
        )}
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <User className="h-4 w-4 text-muted-foreground" /> Linked Lead
        </h3>
        {lead ? (
          <div className="rounded-xl bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Customer ID:</span>
              <span className="text-sm font-mono text-xs">{lead.customer_id || lead.id}</span>
            </div>
            {lead.lifecycle_state && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Lifecycle:</span>
                <StatusBadge level="info">{lead.lifecycle_state}</StatusBadge>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Name:</span>
              <span className="text-sm font-medium">{lead.name || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Phone:</span>
              <span className="text-sm">{lead.phone || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Email:</span>
              <span className="text-sm">{lead.email || '—'}</span>
            </div>
            {lead.customer_id && (
              <Link href={`/${slug}/admin/leads/${lead.customer_id}`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                View Lead &rarr;
              </Link>
            )}
          </div>
        ) : (
          <EmptyState title="No linked lead" className="py-8" />
        )}
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Calendar className="h-4 w-4 text-muted-foreground" /> Linked Appointments
        </h3>
        {appointments && appointments.length > 0 ? (
          <div className="space-y-2">
            {appointments.map((apt: any, i: number) => (
              <div key={i} className="rounded-lg bg-card p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{apt.service_name || 'Service'}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(apt.appointment_time)}</p>
                  {apt.cancellation_reason && (
                    <p className="text-xs text-red-500">Reason: {apt.cancellation_reason}</p>
                  )}
                </div>
                <StatusBadge level={statusLevel(apt.status)}>{apt.status}</StatusBadge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No appointments linked to this conversation" className="py-8" />
        )}
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Truck className="h-4 w-4 text-muted-foreground" /> Delivery Records
        </h3>
        {deliveries && deliveries.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Provider</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Channel</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Failure Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Message Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {deliveries.map((d: any, i: number) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="px-4 py-3">{d.provider || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge level={d.channel === 'whatsapp' ? 'success' : 'info'}>{d.channel || '—'}</StatusBadge></td>
                    <td className="px-4 py-3"><StatusBadge level={statusLevel(d.delivery_status)}>{d.delivery_status || '—'}</StatusBadge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{d.failure_reason || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(d.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{(d.message_preview || d.message_body || '—').slice(0, 80)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No delivery records" className="py-8" />
        )}
      </div>
    </div>
  );
}
