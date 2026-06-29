'use client';

import { useState, useEffect } from 'react';
import { getUnreadCount } from '@/lib/api/notifications';
import { getDashboard } from '@/lib/api/ops';
import { Loader } from '@/components/ui/loader';

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
    { label: 'Unread notifications', count: unread, color: 'bg-red-500/10 text-red-400 border border-red-500/20' },
    { label: 'Pending escalations', count: pendingEsc, color: 'bg-red-500/10 text-red-400 border border-red-500/20' },
    { label: 'Open leads', count: openLeads, color: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
    { label: 'Appointments today', count: todayAppts, color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  ];

  return (
    <div className="product-card">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-white">Attention Required</h2>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader size={32} color="#a3a3a3" /></div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">{item.label}</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${item.color}`}>
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
