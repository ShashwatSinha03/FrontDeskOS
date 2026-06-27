'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  getConversationDetail,
  joinInboxConversation,
  returnInboxToAI,
  sendInboxMessage,
} from '@/lib/api/ops';
import { PageHeader } from '@/components/design/page-header';
import { EmptyState } from '@/components/design/empty-state';
import { MessageSquare } from 'lucide-react';

function waitingDuration(date: Date | string | null): string {
  if (!date) return '';
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

function timeAgo(date: Date | string | null): string {
  if (!date) return '';
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function InboxConversationPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.businessSlug as string;
  const conversationId = params.conversationId as string;

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = detail?.messages || [];
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 80,
    overscan: 10,
  });

  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' });
    }
  }, [messages.length]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getConversationDetail(conversationId);
      if (res.success) setDetail(res.data);
      else setError(res.error || 'Failed to load');
    } catch {
      setError('Failed to load conversation');
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => { load(); }, [load]);

  async function handleJoin() {
    setError('');
    const res = await joinInboxConversation(conversationId);
    if (res.success) {
      setMsg('You have joined this conversation.');
      load();
    } else {
      setError(res.error || 'Failed to join');
    }
  }

  async function handleReturnToAI() {
    setError('');
    const res = await returnInboxToAI(conversationId);
    if (res.success) {
      setMsg('Conversation returned to AI.');
      load();
    } else {
      setError(res.error || 'Failed to return to AI');
    }
  }

  async function handleSend() {
    if (!input.trim()) return;
    setSending(true);
    setError('');
    const res = await sendInboxMessage(conversationId, input.trim());
    if (res.success) {
      setInput('');
      load();
    } else {
      setError(res.error || 'Failed to send');
    }
    setSending(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="space-y-4">
        <PageHeader title="Conversation" description="" />
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
        <button onClick={load} className="text-sm text-blue-600 hover:underline">Retry</button>
      </div>
    );
  }

  const conv = detail?.conversation;
  const workflow = detail?.workflow;
  const appointments = detail?.appointments || [];
  const ownershipStatus = conv?.ownership_status;
  const isHumanActive = ownershipStatus === 'human_active';
  const isHumanPending = ownershipStatus === 'human_pending';
  const isReturnedToAI = ownershipStatus === 'returned_to_ai';

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 mb-3">
          <div className="min-w-0">
            <PageHeader
              title={conv?.customer_name || 'Conversation'}
              description={`${conv?.customer_phone || ''} ${conv?.channel_type ? `via ${conv.channel_type.replace('_', ' ')}` : ''}`}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {ownershipStatus && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${
                isHumanPending ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                isHumanActive ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                isReturnedToAI ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {(ownershipStatus || '').replace(/_/g, ' ')}
              </span>
            )}
            {isHumanPending && (
              <button
                onClick={handleJoin}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
              >
                Join Conversation
              </button>
            )}
            {isHumanActive && (
              <button
                onClick={handleReturnToAI}
                className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted whitespace-nowrap"
              >
                Return to AI
              </button>
            )}
            {isReturnedToAI && (
              <button
                onClick={handleJoin}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
              >
                Take Over
              </button>
            )}
          </div>
        </div>

        {msg && (
          <div className="mb-2 rounded-md border border-green-200 bg-green-50 p-2 text-xs text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
            {msg}
          </div>
        )}
        {error && (
          <div className="mb-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-600">{error}</div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-lg bg-card mb-3">
          {messages.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No messages" description="No messages in this conversation yet." />
          ) : (
            <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const m = messages[virtualItem.index];
                return (
                  <div
                    key={m.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    className={`flex p-4 ${m.sender === 'customer' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        m.sender === 'customer'
                          ? 'bg-muted text-foreground'
                          : m.sender === 'human_owner'
                          ? 'bg-blue-500 text-white'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{m.content}</div>
                      <div className={`mt-1 text-[10px] ${m.sender === 'customer' ? 'text-muted-foreground' : 'text-white/70'}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {m.sender === 'human_owner' && ' · You'}
                        {m.sender === 'agent' && ' · AI'}
                        {m.sender === 'customer' && ' · Customer'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Message Input */}
        {(isHumanActive || isHumanPending) && (
          <div className="flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={isHumanPending ? 'Join the conversation to reply...' : 'Type a message...'}
              disabled={!isHumanActive || sending}
              className="flex-1 rounded-lg bg-card bg-background px-3 py-2 text-sm disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!isHumanActive || sending || !input.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        )}
      </div>

      {/* Info Sidebar (collapses below on mobile) */}
      <div className="w-full lg:w-72 shrink-0 space-y-3">
        {/* Customer Info */}
        <div className="rounded-lg bg-card p-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Customer</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium truncate ml-2">{conv?.customer_name || 'Unknown'}</span>
            </div>
            {conv?.customer_phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{conv.customer_phone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Channel</span>
              <span className="font-medium capitalize">{(conv?.channel_type || '').replace('_', ' ')}</span>
            </div>
            {conv?.lifecycle_state && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">State</span>
                <span className="font-medium text-xs">{conv.lifecycle_state}</span>
              </div>
            )}
          </div>
        </div>

        {/* Escalation Details */}
        <div className="rounded-lg bg-card p-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Escalation</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className={`font-medium text-xs ${isHumanPending ? 'text-red-600' : isHumanActive ? 'text-blue-600' : 'text-muted-foreground'}`}>
                {(ownershipStatus || 'ai_active').replace(/_/g, ' ')}
              </span>
            </div>
            {conv?.escalated_at && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waiting</span>
                  <span className="font-medium">{waitingDuration(conv.escalated_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Since</span>
                  <span className="font-medium text-xs">{timeAgo(conv.escalated_at)}</span>
                </div>
              </>
            )}
            {conv?.owner_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Owner</span>
                <span className="font-medium text-xs">{conv.owner_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Workflow Info */}
        {workflow && (
          <div className="rounded-lg bg-card p-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Workflow</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium text-xs">{(workflow.workflow_type || '').replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">State</span>
                <span className="font-medium text-xs">{workflow.workflow_state || '—'}</span>
              </div>
              {workflow.last_asked_field && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Asked</span>
                  <span className="font-medium text-xs truncate ml-2">{workflow.last_asked_field}</span>
                </div>
              )}
              {workflow.collected_data && Object.keys(workflow.collected_data).length > 0 && (
                <div className="mt-1 pt-1 border-t">
                  <span className="text-xs text-muted-foreground block mb-1">Collected Data</span>
                  <pre className="text-[10px] text-muted-foreground/70 whitespace-pre-wrap">
                    {JSON.stringify(workflow.collected_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Appointments */}
        {appointments.length > 0 && (
          <div className="rounded-lg bg-card p-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Appointments</h3>
            <div className="space-y-2">
              {appointments.map((apt: any) => (
                <div key={apt.id} className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">
                      {new Date(apt.appointment_time).toLocaleDateString()}
                    </span>
                    <span className={`text-xs font-medium ${
                      apt.status === 'confirmed' ? 'text-green-600' :
                      apt.status === 'completed' ? 'text-blue-600' :
                      apt.status === 'cancelled' ? 'text-red-600' : 'text-muted-foreground'
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
