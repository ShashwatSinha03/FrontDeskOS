'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/design/page-header';
import { EmptyState } from '@/components/design/empty-state';
import { Button } from '@/components/ui/button';
import { fetchActivity, ActivityEvent } from '@/lib/founder';

const TYPE_ICONS: Record<string, string> = {
  business_created: '🏢',
  appointment_booked: '📅',
  escalation_created: '🔴',
  lead_captured: '👤',
  subscription_created: '💳',
  owner_invited: '✉️',
};

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchActivity(50);
      setEvents(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Failed to load activity"
        description={error}
        action={<Button onClick={load}>Retry</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Activity" description="Platform-wide event history." />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState title="No activity yet" description="Events will appear as businesses are created and customers interact." />
      ) : (
        <div className="space-y-1">
          {events.map((event, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border bg-card px-5 py-3.5 hover:bg-muted/30 transition-colors">
              <span className="text-lg">{TYPE_ICONS[event.type] || '•'}</span>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/ops/businesses/${event.businessId}`}
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  {event.businessName}
                </Link>
                <p className="text-sm text-muted-foreground truncate">{event.summary}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(event.timestamp).toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
