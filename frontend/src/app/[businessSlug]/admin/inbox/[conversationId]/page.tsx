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
import { Loader } from '@/components/ui/loader';

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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size={40} color="#a3a3a3" />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="space-y-4">
        <PageHeader title="Conversation" description="" />
        <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
        <button onClick={load} className="text-sm text-blue-400 hover:underline">Retry</button>
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
                className="rounded-md bg-blue-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500/80 whitespace-nowrap"
              >
                Join Conversation
              </button>
            )}
            {isHumanActive && (
              <button
                onClick={handleReturnToAI}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 whitespace-nowrap"
              >
                Return to AI
              </button>
            )}
            {isReturnedToAI && (
              <button
                onClick={handleJoin}
                className="rounded-md bg-blue-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500/80 whitespace-nowrap"
              >
                Take Over
              </button>
            )}
          </div>
        </div>

        {msg && (
          <div className="mb-2 rounded-md border border-green-500/20 bg-green-500/10 p-2 text-xs text-green-400">
            {msg}
          </div>
        )}
        {error && (
          <div className="mb-2 rounded-md border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-400">{error}</div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto product-card mb-3">
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
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        m.sender === 'customer'
                          ? 'bg-zinc-800 text-zinc-300'
                          : m.sender === 'human_owner'
                          ? 'bg-blue-600/80 text-white'
                          : 'bg-blue-600/80 text-white'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{m.content}</div>
                      <div className={`mt-1 text-[10px] ${m.sender === 'customer' ? 'text-zinc-500' : 'text-white/70'}`}>
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
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!isHumanActive || sending || !input.trim()}
              className="rounded-lg bg-blue-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500/80 disabled:opacity-50"
            >
              {sending ? <Loader size={16} color="currentColor" /> : 'Send'}
            </button>
          </div>
        )}
      </div>

      {/* Info Sidebar (collapses below on mobile) */}
      <div className="w-full lg:w-72 shrink-0 space-y-3">
        {/* Customer Info */}
        <div className="product-card p-3">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Customer</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Name</span>
              <span className="font-medium text-white truncate ml-2">{conv?.customer_name || 'Unknown'}</span>
            </div>
            {conv?.customer_phone && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Phone</span>
                <span className="font-medium text-white">{conv.customer_phone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-400">Channel</span>
              <span className="font-medium text-white capitalize">{(conv?.channel_type || '').replace('_', ' ')}</span>
            </div>
            {conv?.lifecycle_state && (
              <div className="flex justify-between">
                <span className="text-zinc-400">State</span>
                <span className="font-medium text-xs text-white">{conv.lifecycle_state}</span>
              </div>
            )}
          </div>
        </div>

        {/* Escalation Details */}
        <div className="product-card p-3">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Escalation</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Status</span>
              <span className={`font-medium text-xs ${isHumanPending ? 'text-red-400' : isHumanActive ? 'text-blue-400' : 'text-zinc-400'}`}>
                {(ownershipStatus || 'ai_active').replace(/_/g, ' ')}
              </span>
            </div>
            {conv?.escalated_at && (
              <>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Waiting</span>
                  <span className="font-medium text-white">{waitingDuration(conv.escalated_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Since</span>
                  <span className="font-medium text-xs text-white">{timeAgo(conv.escalated_at)}</span>
                </div>
              </>
            )}
            {conv?.owner_name && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Owner</span>
                <span className="font-medium text-xs text-white">{conv.owner_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Workflow Info */}
        {workflow && (
          <div className="product-card p-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Workflow</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Type</span>
                <span className="font-medium text-xs text-white">{(workflow.workflow_type || '').replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">State</span>
                <span className="font-medium text-xs text-white">{workflow.workflow_state || '—'}</span>
              </div>
              {workflow.last_asked_field && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Last Asked</span>
                  <span className="font-medium text-xs text-white truncate ml-2">{workflow.last_asked_field}</span>
                </div>
              )}
              {workflow.collected_data && Object.keys(workflow.collected_data).length > 0 && (
                <div className="mt-1 pt-1 border-t">
                  <span className="text-xs text-zinc-400 block mb-1">Collected Data</span>
                  <pre className="text-[10px] text-zinc-500 whitespace-pre-wrap">
                    {JSON.stringify(workflow.collected_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Appointments */}
        {appointments.length > 0 && (
          <div className="product-card p-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Appointments</h3>
            <div className="space-y-2">
              {appointments.map((apt: any) => (
                <div key={apt.id} className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400 text-xs">
                      {new Date(apt.appointment_time).toLocaleDateString()}
                    </span>
                    <span className={`text-xs font-medium ${
                      apt.status === 'confirmed' ? 'text-green-400' :
                      apt.status === 'completed' ? 'text-blue-400' :
                      apt.status === 'cancelled' ? 'text-red-400' : 'text-zinc-400'
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400">
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
