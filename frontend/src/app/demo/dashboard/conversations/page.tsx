'use client';

import Link from 'next/link';
import { useDemo, useDemoStore } from '@/lib/demo/stores/demo-provider';
import { Clock, AlertTriangle } from 'lucide-react';

export default function DemoConversationsPage() {
  const { conversations } = useDemo();
  const convs = useDemoStore(conversations, () => conversations.conversations);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Conversations</h1>
      <p className="mt-1 text-sm text-zinc-500">{convs.length} total conversations</p>
      <div className="mt-6 space-y-3">
        {convs.map((conv) => (
          <Link
            key={conv.id}
            href={`/demo/inbox/${conv.id}`}
            className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-zinc-300">
              {conv.customerName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white truncate">{conv.customerName}</p>
                {conv.status === 'escalated' && <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                {conv.unread > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">{conv.unread}</span>}
              </div>
              <p className="mt-0.5 truncate text-sm text-zinc-500">
                {conv.messages[conv.messages.length - 1]?.content ?? 'No messages'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Clock className="h-3 w-3" />
              <span>{conv.channel}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
