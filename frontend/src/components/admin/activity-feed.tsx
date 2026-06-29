'use client';

import { Clock } from 'lucide-react';

interface Activity {
  event_type: string;
  occurred_at: string;
  description: string;
  customer_id: string | null;
  customer_name: string | null;
}

function activityIcon(type: string) {
  switch (type) {
    case 'lead_created': return '●';
    case 'appointment_booked': return '◆';
    case 'escalation_raised': return '▲';
    case 'escalation_resolved': return '▼';
    case 'staff_invited': return '+';
    default: return '·';
  }
}

function activityColor(type: string) {
  switch (type) {
    case 'lead_created': return 'text-blue-500';
    case 'appointment_booked': return 'text-green-500';
    case 'escalation_raised': return 'text-red-500';
    case 'escalation_resolved': return 'text-green-600';
    case 'staff_invited': return 'text-purple-500';
    default: return 'text-muted-foreground';
  }
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActivityFeed({ activities, loading }: { activities: Activity[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">No recent activity.</p>;
  }

  return (
    <div className="space-y-1">
      {activities.map((a, i) => (
        <div key={i} className="flex items-start gap-2 py-1.5 text-sm">
          <span className={`mt-0.5 text-xs ${activityColor(a.event_type)}`}>
            {activityIcon(a.event_type)}
          </span>
          <span className="flex-1 text-muted-foreground">{a.description}</span>
          <span className="shrink-0 text-xs text-muted-foreground/60">{timeAgo(a.occurred_at)}</span>
        </div>
      ))}
    </div>
  );
}
