'use client';

import { Clock } from 'lucide-react';
import { Loader } from '@/components/ui/loader';

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
    default: return 'text-zinc-500';
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
    return <div className="flex items-center justify-center py-12"><Loader size={32} color="#a3a3a3" /></div>;
  }

  if (activities.length === 0) {
    return <p className="text-sm text-zinc-400">No recent activity.</p>;
  }

  return (
    <div className="space-y-1">
      {activities.map((a, i) => (
        <div key={i} className="flex items-start gap-2 py-1.5 text-sm">
          <span className={`mt-0.5 text-xs ${activityColor(a.event_type)}`}>
            {activityIcon(a.event_type)}
          </span>
          <span className="flex-1 text-zinc-400">{a.description}</span>
          <span className="shrink-0 text-xs text-zinc-500">{timeAgo(a.occurred_at)}</span>
        </div>
      ))}
    </div>
  );
}
