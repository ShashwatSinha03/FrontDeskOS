'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supportSearch } from '@/lib/api/founder';
import { PageHeader } from '@/components/design/page-header';
import { EmptyState } from '@/components/design/empty-state';
import { StatusBadge, statusLevel } from '@/components/design/status-badge';
import { Skeleton } from '@/components/design/skeleton';
import { Building2, User, MessageSquare, Calendar, Search, AlertCircle } from 'lucide-react';

export default function SupportSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setSearched(true);
    const res = await supportSearch(query.trim());
    if (res.success) setResults(res.data || {});
    else setError(res.error || 'Search failed');
    setLoading(false);
  }, [query]);

  const hasAnyResults = results && (
    (results.businesses && results.businesses.length > 0) ||
    (results.leads && results.leads.length > 0) ||
    (results.conversations && results.conversations.length > 0) ||
    (results.appointments && results.appointments.length > 0)
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Support Search" description="Search across all businesses and entities" />

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          placeholder="Search by name, phone, email, conversation ID, appointment ID..."
          className="block w-full max-w-2xl rounded-lg bg-card border-border bg-background px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button onClick={doSearch} disabled={loading || !query.trim()}
          className="rounded-lg bg-blue-600/80 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700/80 disabled:opacity-50">
          Search
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={doSearch} className="rounded border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100">Retry</button>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="mb-2 h-5 w-32" />
              <div className="space-y-2">
                {[1, 2].map((j) => (
                  <Skeleton key={j} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && searched && !hasAnyResults && !error && (
        <EmptyState icon={Search} title={`No results found for '${query}'`} description="Try a different search term." />
      )}

      {!loading && !searched && (
        <EmptyState icon={Search} title="Enter a search term to find customers, conversations, and more" />
      )}

      {!loading && results && (
        <div className="space-y-8">
          {results.businesses && results.businesses.length > 0 && (
            <Section title="Businesses" icon={Building2}>
              {results.businesses.map((b: any, i: number) => (
                <Link key={i} href={`/ops/businesses/${b.id}`}
                  className="block rounded-lg bg-card p-4 hover:bg-muted/30 transition-colors">
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.slug}</div>
                </Link>
              ))}
            </Section>
          )}

          {results.leads && results.leads.length > 0 && (
            <Section title="Leads" icon={User}>
              {results.leads.map((l: any, i: number) => (
                <Link key={i} href={`/${l.businessSlug || l.slug}/admin/leads/${l.id}`}
                  className="block rounded-lg bg-card p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{l.name || 'Unknown'}</div>
                    {l.lifecycle_state && <StatusBadge level="info">{l.lifecycle_state}</StatusBadge>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground flex gap-3">
                    <span>{l.phone || '—'}</span>
                    <span>{l.email || '—'}</span>
                    {l.businessName && <span>{l.businessName}</span>}
                  </div>
                </Link>
              ))}
            </Section>
          )}

          {results.conversations && results.conversations.length > 0 && (
            <Section title="Conversations" icon={MessageSquare}>
              {results.conversations.map((c: any, i: number) => (
                <Link key={i} href={`/${c.businessSlug || c.slug}/admin/conversations/${c.id}`}
                  className="block rounded-lg bg-card p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{c.customer_name || 'Unknown'}</div>
                    <StatusBadge level={c.channel_type?.toLowerCase() === 'whatsapp' ? 'success' : 'info'}>{c.channel_type || '—'}</StatusBadge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {c.businessName && <span>{c.businessName}</span>}
                  </div>
                </Link>
              ))}
            </Section>
          )}

          {results.appointments && results.appointments.length > 0 && (
            <Section title="Appointments" icon={Calendar}>
              {results.appointments.map((a: any, i: number) => (
                <Link key={i} href={`/${a.businessSlug || a.slug}/admin/appointments`}
                  className="block rounded-lg bg-card p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{a.appointment_time ? new Date(a.appointment_time).toLocaleString() : '—'}</div>
                    <StatusBadge level={statusLevel(a.status)}>{a.status || '—'}</StatusBadge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground flex gap-3">
                    <span>{a.customer_name || a.name || '—'}</span>
                    {a.businessName && <span>{a.businessName}</span>}
                  </div>
                </Link>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        <Icon className="h-4 w-4" /> {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
