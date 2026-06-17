'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getInboxConversations, getInboxCounts } from '@/lib/api/ops';
import { PageHeader } from '@/components/design/page-header';
import { cn } from '@/lib/utils';

type OwnershipStatus = 'human_pending' | 'human_active' | 'returned_to_ai';

const TABS: { key: OwnershipStatus; label: string }[] = [
  { key: 'human_pending', label: 'Waiting' },
  { key: 'human_active', label: 'Active' },
  { key: 'returned_to_ai', label: 'Returned to AI' },
];

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

export default function InboxPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.businessSlug as string;

  const [tab, setTab] = useState<OwnershipStatus>('human_pending');
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({ humanPending: 0, humanActive: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const loadCounts = useCallback(async () => {
    try {
      const res = await getInboxCounts();
      if (res.success) setCounts(res.data);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [listRes] = await Promise.all([
      getInboxConversations({ ownershipStatus: tab, search: search || undefined, page, limit }),
      loadCounts(),
    ]);
    if (listRes.success) {
      setData(listRes.data);
      setTotalCount(listRes.meta?.totalCount ?? 0);
    } else {
      setError(listRes.error || 'Failed to load');
    }
    setLoading(false);
  }, [tab, search, page, loadCounts]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description={`${counts.humanPending} waiting, ${counts.humanActive} active`}
      />

      {error && !loading && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border p-1 bg-muted/30">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
              {t.key === 'human_pending' && counts.humanPending > 0 && (
                <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {counts.humanPending}
                </span>
              )}
              {t.key === 'human_active' && counts.humanActive > 0 && (
                <span className="ml-1.5 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {counts.humanActive}
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or phone..."
          className="rounded-md border px-3 py-1.5 text-sm w-56"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">No conversations in this section.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {data.map((conv) => (
            <button
              key={conv.id}
              onClick={() => router.push(`/${slug}/admin/inbox/${conv.id}`)}
              className="w-full rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {conv.customerName || 'Unknown'}
                    </span>
                    {conv.ownershipStatus === 'human_pending' && (
                      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        Escalated
                      </span>
                    )}
                    {conv.ownershipStatus === 'human_active' && conv.ownerName && (
                      <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {conv.ownerName}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    {conv.customerPhone && <span>{conv.customerPhone}</span>}
                    {conv.lastMessage && (
                      <>
                        <span className="text-muted-foreground/40">&middot;</span>
                        <span className="truncate">{conv.lastMessage}</span>
                      </>
                    )}
                  </div>
                  {conv.escalationReason && (
                    <div className="mt-1 text-xs text-muted-foreground/60 line-clamp-1">
                      Reason: {conv.escalationReason}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs text-muted-foreground">
                    {timeAgo(conv.escalatedAt || conv.lastMessageAt)}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground/50 capitalize">
                    {conv.channelType?.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {totalCount > limit && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {Math.ceil(totalCount / limit)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(totalCount / limit)}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
