'use client';

import { useState, useEffect } from 'react';
import { getUnreadCount } from '@/lib/api/notifications';
import { getDashboard } from '@/lib/api/ops';

export function AttentionRequired() {
  const [unread, setUnread] = useState(0);
  const [pendingEsc, setPendingEsc] = useState(0);
  const [openLeads, setOpenLeads] = useState(0);
  const [todayAppts, setTodayAppts] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getUnreadCount().then((r) => { if (r.success) setUnread(r.data.count); }).catch(() => {}),
      getDashboard().then((r) => {
        if (r.success) {
          setPendingEsc(r.data.pendingEscalations?.length || 0);
          setOpenLeads(r.data.openLeads?.length || 0);
          setTodayAppts(r.data.todayAppointments?.length || 0);
        }
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const items = [
    { label: 'Unread notifications', count: unread, color: 'bg-red-100 text-red-700' },
    { label: 'Pending escalations', count: pendingEsc, color: 'bg-red-100 text-red-700' },
    { label: 'Open leads', count: openLeads, color: 'bg-yellow-100 text-yellow-700' },
    { label: 'Appointments today', count: todayAppts, color: 'bg-blue-100 text-blue-700' },
  ];

  return (
    <div className="rounded-lg bg-card">
      <div className="px-4 py-3">
        <h2 className="text-sm font-semibold">Attention Required</h2>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4].map((i) => <div key={i} className="h-6 animate-pulse rounded bg-muted" />)}
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${item.color}`}>
                  {item.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
