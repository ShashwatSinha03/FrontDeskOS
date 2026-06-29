'use client';

import { useState, useEffect } from 'react';
import { getNotifications, markRead, markAllRead } from '@/lib/api/notifications';
import { Loader } from '@/components/ui/loader';

interface Props {
  open: boolean;
  onClose: () => void;
  onMarked: () => void;
}

const TYPE_ICONS: Record<string, string> = {
  lead_captured: '●',
  lead_qualified: '●',
  lead_won: '●',
  lead_lost: '●',
  appointment_booked: '●',
  appointment_confirmed: '●',
  appointment_completed: '●',
  appointment_cancelled: '●',
  appointment_rescheduled: '●',
  escalation_raised: '●',
  escalation_resolved: '●',
  escalation_required: '●',
  escalation_reminder_5min: '●',
  escalation_reminder_15min: '●',
  escalation_reminder_30min: '●',
  staff_invited: '●',
  staff_promoted: '●',
  staff_removed: '●',
};

const TYPE_COLORS: Record<string, string> = {
  lead_captured: 'text-blue-500',
  lead_qualified: 'text-purple-500',
  lead_won: 'text-green-500',
  lead_lost: 'text-red-500',
  appointment_booked: 'text-blue-500',
  appointment_confirmed: 'text-green-500',
  appointment_completed: 'text-green-600',
  appointment_cancelled: 'text-red-500',
  appointment_rescheduled: 'text-yellow-500',
  escalation_raised: 'text-red-500',
  escalation_resolved: 'text-green-500',
  escalation_required: 'text-red-500',
  escalation_reminder_5min: 'text-orange-500',
  escalation_reminder_15min: 'text-orange-500',
  escalation_reminder_30min: 'text-yellow-500',
  staff_invited: 'text-blue-500',
  staff_promoted: 'text-purple-500',
  staff_removed: 'text-orange-500',
};

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return '< 1m ago';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function NotificationDrawer({ open, onClose, onMarked }: Props) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getNotifications({ limit: 50 }).then((res) => {
      if (res.success) setNotifications(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [open]);

  async function handleMarkRead(id: string) {
    await markRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    onMarked();
  }

  async function handleMarkAll() {
    await markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    onMarked();
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      )}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-sm border-l bg-background shadow-xl transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold">Notifications</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleMarkAll}
              className="text-xs text-primary hover:underline">Mark all read</button>
            <button onClick={onClose}
              className="rounded p-1 hover:bg-muted">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100%-53px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader size={32} color="#a3a3a3" /></div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-sm text-muted-foreground">
              <p>No notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n: any) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 text-sm transition-colors ${n.isRead ? 'bg-background' : 'bg-muted/30'}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 shrink-0 text-xs ${TYPE_COLORS[n.type] || 'text-muted-foreground'}`}>
                      {TYPE_ICONS[n.type] || '●'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {timeAgo(new Date(n.createdAt))}
                      </p>
                      {n.type.startsWith('escalation') && (
                        <p className="text-[11px] text-primary mt-0.5 font-medium">→ View in Inbox</p>
                      )}
                    </div>
                    {!n.isRead && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10"
                      >
                        Read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
