'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getConversationDetail,
  joinInboxConversation,
  returnInboxToAI,
  sendInboxMessage,
} from '@/lib/api/ops';
import { PageHeader } from '@/components/design/page-header';

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.messages]);

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

  const conversation = detail?.conversation;
  const messages = detail?.messages || [];
  const ownershipStatus = conversation?.ownership_status;
  const isHumanActive = ownershipStatus === 'human_active';
  const isHumanPending = ownershipStatus === 'human_pending';
  const isReturnedToAI = ownershipStatus === 'returned_to_ai';

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <PageHeader
            title={conversation?.customer_name || 'Conversation'}
            description={`${conversation?.customer_phone || ''} ${conversation?.channel_type ? `via ${conversation.channel_type}` : ''}`}
          />
        </div>
        <div className="flex items-center gap-2">
          {ownershipStatus && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isHumanPending ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
              isHumanActive ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
              'bg-muted text-muted-foreground'
            }`}>
              {ownershipStatus.replace(/_/g, ' ')}
            </span>
          )}
          {isHumanPending && (
            <button
              onClick={handleJoin}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Join
            </button>
          )}
          {isHumanActive && (
            <button
              onClick={handleReturnToAI}
              className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              Return to AI
            </button>
          )}
          {isReturnedToAI && (
            <button
              onClick={handleJoin}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Take Over
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className="mt-2 rounded-md border border-green-200 bg-green-50 p-2 text-xs text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
          {msg}
        </div>
      )}
      {error && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-600">{error}</div>
      )}

      <div className="mt-4 flex-1 overflow-y-auto rounded-lg border bg-card">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No messages yet.
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {messages.map((m: any) => (
              <div
                key={m.id}
                className={`flex ${m.sender === 'customer' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
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
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {(isHumanActive || isHumanPending) && (
        <div className="mt-3 flex gap-2 shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={isHumanPending ? 'Join the conversation to reply...' : 'Type a message...'}
            disabled={!isHumanActive || sending}
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-50"
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
  );
}
