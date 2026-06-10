import { cn } from '@/lib/utils';

type StatusLevel = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple' | 'teal' | 'orange' | 'emerald';

const levelStyles: Record<StatusLevel, string> = {
  neutral: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

interface StatusBadgeProps {
  level: StatusLevel;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ level, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        levelStyles[level],
        className
      )}
    >
      {children}
    </span>
  );
}

export function lifecycleLevel(state: string): StatusLevel {
  const map: Record<string, StatusLevel> = {
    'New Inquiry': 'info',
    'Information Gathering': 'purple',
    Qualified: 'teal',
    'Booking Opportunity': 'orange',
    Booked: 'success',
    Customer: 'emerald',
    'Follow-Up Pending': 'warning',
    Escalated: 'danger',
    Lost: 'neutral',
  };
  return map[state] || 'neutral';
}

export function statusLevel(status: string): StatusLevel {
  const map: Record<string, StatusLevel> = {
    pending: 'warning',
    confirmed: 'success',
    cancelled: 'danger',
    rescheduled: 'info',
    resolved: 'success',
    sent: 'success',
    approved: 'success',
    rejected: 'neutral',
  };
  return map[status] || 'neutral';
}
