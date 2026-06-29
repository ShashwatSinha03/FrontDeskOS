'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useDemo, useDemoStore } from '@/lib/demo/stores/demo-provider';
import { ArrowLeft, Phone, Globe, Smartphone, MessageSquare, UserPlus, RotateCcw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

function ChannelIcon({ channel }: { channel: string }) {
  switch (channel) {
    case 'whatsapp': return <Phone className="h-3.5 w-3.5" />;
    case 'web': return <Globe className="h-3.5 w-3.5" />;
    case 'sms': return <Smartphone className="h-3.5 w-3.5" />;
    default: return <MessageSquare className="h-3.5 w-3.5" />;
  }
}

export default function DemoConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;
  const { conversations, bus } = useDemo();
  const convs = useDemoStore(conversations, () => conversations.conversations);
  const [replyText, setReplyText] = useState('');
  const [ownerJoined, setOwnerJoined] = useState(false);

  const conv = convs.find(c => c.id === conversationId);
  if (!conv) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-zinc-500">Conversation not found</p>
      </div>
    );
  }

  const handleJoin = () => {
    setOwnerJoined(true);
    const msg = { id: crypto.randomUUID(), role: 'human' as const, content: 'A team member has joined the conversation.', timestamp: Date.now() };
    conversations.addMessage(conversationId, msg);
    bus.emit('conversation_updated', { conversation: { ...conv, status: 'active' } });
  };

  const handleReturnToAI = () => {
    setOwnerJoined(false);
    const msg = { id: crypto.randomUUID(), role: 'ai' as const, content: 'The conversation has been returned to the AI assistant.', timestamp: Date.now() };
    conversations.addMessage(conversationId, msg);
    bus.emit('conversation_updated', { conversation: { ...conv, status: 'active' } });
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    const msg = { id: crypto.randomUUID(), role: 'human' as const, content: replyText.trim(), timestamp: Date.now() };
    conversations.addMessage(conversationId, msg);
    setReplyText('');
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/10 text-green-400',
    escalated: 'bg-amber-500/10 text-amber-400',
    resolved: 'bg-zinc-800 text-zinc-400',
    pending: 'bg-blue-500/10 text-blue-400',
  };

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link href="/demo/inbox" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">{conv.customerName}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[conv.status]}`}>
              {conv.status}
            </span>
            {conv.status === 'escalated' && <AlertTriangle className="h-4 w-4 text-amber-400" />}
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-zinc-500">
            <span>{conv.customerPhone}</span>
            <span className="flex items-center gap-1">
              <ChannelIcon channel={conv.channel} />
              {conv.channel}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="mb-6 space-y-4">
        {conv.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'customer' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === 'customer'
                ? 'rounded-bl-sm bg-zinc-800 text-zinc-200'
                : msg.role === 'human'
                ? 'rounded-br-sm bg-green-600/80 text-white'
                : 'rounded-br-sm bg-blue-600/80 text-white'
            }`}>
              <p>{msg.content}</p>
              <p className="mt-1 text-[10px] text-white/50">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Customer info panel */}
      <div className="mb-6 product-card p-4">
        <h3 className="text-sm font-medium text-white">Customer Info</h3>
        <div className="mt-3 space-y-2 text-sm text-zinc-400">
          <p>Name: {conv.customerName}</p>
          <p>Phone: {conv.customerPhone}</p>
          <p>Channel: {conv.channel}</p>
          <p>Messages: {conv.messages.length}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {!ownerJoined && (
          <button
            onClick={handleJoin}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500/80"
          >
            <UserPlus className="h-4 w-4" />
            Join Conversation
          </button>
        )}
        {ownerJoined && (
          <>
            <button
              onClick={handleReturnToAI}
              data-tour="tour-return-to-ai"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              <RotateCcw className="h-4 w-4" />
              Return to AI
            </button>
            <div className="flex flex-1 items-center gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                placeholder="Type a reply..."
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSendReply}
                disabled={!replyText.trim()}
                className="rounded-lg bg-green-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-green-500/80 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
