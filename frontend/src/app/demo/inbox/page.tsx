'use client';

import Link from 'next/link';
import { useDemo, useDemoStore } from '@/lib/demo/stores/demo-provider';
import { MessageSquare, AlertTriangle, Phone, Globe, Smartphone } from 'lucide-react';

function ChannelIcon({ channel }: { channel: string }) {
  switch (channel) {
    case 'whatsapp': return <Phone className="h-3.5 w-3.5" />;
    case 'web': return <Globe className="h-3.5 w-3.5" />;
    case 'sms': return <Smartphone className="h-3.5 w-3.5" />;
    default: return <MessageSquare className="h-3.5 w-3.5" />;
  }
}

function TimeAgo({ timestamp }: { timestamp: number }) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function DemoInboxPage() {
  const { conversations } = useDemo();
  const convs = useDemoStore(conversations, () => conversations.conversations);

  return (
    <div className="pb-12">
      <h1 className="text-2xl font-bold text-white">Inbox</h1>
      <p className="mt-1 text-sm text-zinc-500">{convs.length} conversations</p>
      <div className="mt-6 space-y-2">
        {convs.map((conv) => (
          <Link
            key={conv.id}
            href={`/demo/inbox/${conv.id}`}
            className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-zinc-300">
              {conv.customerName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-white">{conv.customerName}</p>
                {conv.status === 'escalated' && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
                {conv.unread > 0 && (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                    {conv.unread}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-sm text-zinc-500">
                {conv.messages[conv.messages.length - 1]?.content ?? ''}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <ChannelIcon channel={conv.channel} />
                <TimeAgo timestamp={conv.createdAt} />
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                conv.status === 'active' ? 'bg-green-500/10 text-green-400' :
                conv.status === 'escalated' ? 'bg-amber-500/10 text-amber-400' :
                conv.status === 'resolved' ? 'bg-zinc-800 text-zinc-400' :
                'bg-blue-500/10 text-blue-400'
              }`}>
                {conv.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
