'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getInboxConversations, getInboxCounts } from '@/lib/api/ops';
import { PageHeader } from '@/components/design/page-header';
import { EmptyState } from '@/components/design/empty-state';
import { cn } from '@/lib/utils';
import { Inbox } from 'lucide-react';

type OwnershipStatus = 'human_pending' | 'human_active' | 'returned_to_ai' | 'closed';

const TABS: { key: OwnershipStatus | ''; label: string }[] = [
  { key: 'human_pending', label: 'Waiting' },
  { key: 'human_active', label: 'Active' },
  { key: 'returned_to_ai', label: 'Returned' },
  { key: 'closed', label: 'Resolved' },
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

export default function InboxPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.businessSlug as string;

  const [tab, setTab] = useState<OwnershipStatus | ''>('human_pending');
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({ humanPending: 0, humanActive: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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
    const params: Record<string, any> = {};
    if (tab) params.ownershipStatus = tab;
    if (search) params.search = search;
    if (channelFilter) params.channelType = channelFilter;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    params.page = page;
    params.limit = limit;

    const [listRes] = await Promise.all([
      getInboxConversations(params),
      loadCounts(),
    ]);
    if (listRes.success) {
      setData(listRes.data);
      setTotalCount(listRes.meta?.totalCount ?? 0);
    } else {
      setError(listRes.error || 'Failed to load');
    }
    setLoading(false);
  }, [tab, search, channelFilter, dateFrom, dateTo, page, limit, loadCounts]);

  useEffect(() => { load(); }, [load]);

  const tabCount = (key: OwnershipStatus | '') => {
    if (key === 'human_pending') return counts.humanPending;
    if (key === 'human_active') return counts.humanActive;
    if (key === 'closed') return counts.closed;
    return 0;
  };

  const statusColors: Record<string, string> = {
    human_pending: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    human_active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    returned_to_ai: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    closed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description={`${counts.humanPending} waiting, ${counts.humanActive} active, ${counts.closed} resolved`}
      />

      {error && !loading && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-card p-1 bg-muted/30 overflow-x-auto">
          {TABS.map((t) => {
            const count = t.key ? tabCount(t.key) : 0;
            return (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setPage(1); }}
                className={cn(
                  'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  tab === t.key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
                {count > 0 && (
                  <span className={cn(
                    'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white',
                    t.key === 'human_pending' ? 'bg-red-500' :
                    t.key === 'human_active' ? 'bg-blue-500' :
                    'bg-muted-foreground'
                  )}>
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name or phone..."
            className="rounded-md border px-3 py-1.5 text-sm w-full sm:w-44"
          />
          <select
            value={channelFilter}
            onChange={(e) => { setChannelFilter(e.target.value); setPage(1); }}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="">All channels</option>
            <option value="web_chat">Web Chat</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="rounded-md border px-3 py-1.5 text-sm w-36"
            title="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="rounded-md border px-3 py-1.5 text-sm w-36"
            title="To date"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState icon={Inbox} title="No conversations" description="No conversations in this section." />
      ) : (
        <div className="space-y-2">
          {data.map((conv) => (
            <button
              key={conv.id}
              onClick={() => router.push(`/${slug}/admin/inbox/${conv.id}`)}
              className="w-full rounded-lg bg-card px-4 py-3 text-left transition-colors hover:bg-accent/50"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">
                      {conv.customerName || 'Unknown'}
                    </span>
                    {conv.ownershipStatus && (
                      <span className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                        statusColors[conv.ownershipStatus] || 'bg-muted text-muted-foreground'
                      )}>
                        {conv.ownershipStatus.replace(/_/g, ' ')}
                      </span>
                    )}
                    {conv.ownerName && (
                      <span className="text-[10px] text-muted-foreground">
                        {conv.ownerName}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    {conv.customerPhone && <span>{conv.customerPhone}</span>}
                    <span className="text-[10px] capitalize">{conv.channelType?.replace('_', ' ')}</span>
                    {conv.lastMessage && (
                      <>
                        <span className="text-muted-foreground/40 hidden sm:inline">&middot;</span>
                        <span className="truncate max-w-[200px] hidden sm:inline">{conv.lastMessage}</span>
                      </>
                    )}
                  </div>
                  {conv.escalationReason && (
                    <div className="mt-1 text-xs text-muted-foreground/60 line-clamp-1">
                      Reason: {conv.escalationReason}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  {conv.escalatedAt && (
                    <div>Waiting: {waitingDuration(conv.escalatedAt)}</div>
                  )}
                  <div className="text-[10px] text-muted-foreground/50">
                    {timeAgo(conv.escalatedAt || conv.lastMessageAt || conv.createdAt)}
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
