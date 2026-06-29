'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  CalendarCheck,
  Mail,
  AlertTriangle,
  BookOpen,
  Settings,
  MessageSquare,
  Activity,
  ActivitySquare,
  Inbox,
} from 'lucide-react';
import { getInboxCounts } from '@/lib/api/ops';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '', icon: LayoutDashboard },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Leads', href: '/leads', icon: Users },
  { label: 'Appointments', href: '/appointments', icon: CalendarCheck },
  { label: 'Inbox', href: '/inbox', icon: Inbox },
  { label: 'Follow-Ups', href: '/follow-ups', icon: Mail },
  { label: 'Escalations', href: '/escalations', icon: AlertTriangle },
  { label: 'Conversations', href: '/conversations', icon: MessageSquare },
  { label: 'Deliveries', href: '/deliveries', icon: Activity },
  { label: 'Activity', href: '/activity', icon: ActivitySquare },
  { label: 'Learning Inbox', href: '/learning-inbox', icon: BookOpen },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function AdminSidebar({ businessName, slug }: { businessName: string; slug: string }) {
  const pathname = usePathname();
  const basePath = `/${slug}/admin`;
  const [inboxCount, setInboxCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchInboxCount = useCallback(async () => {
    try {
      const res = await getInboxCounts();
      if (res.success) setInboxCount(res.data.humanPending);
    } catch {}
  }, []);

  useEffect(() => {
    fetchInboxCount();
    intervalRef.current = setInterval(fetchInboxCount, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchInboxCount]);

  return (
    <aside className="w-56 bg-black shrink-0 hidden md:flex flex-col border-r border-zinc-800">
      <div className="flex h-14 items-center px-5">
          <Link href={`/${slug}`} className="text-sm font-semibold tracking-tight text-zinc-300 hover:text-white transition-colors">
          {businessName}
        </Link>
      </div>
      <nav className="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const fullHref = `${basePath}${item.href}`;
          const isActive = item.href === ''
            ? pathname === basePath
            : pathname.startsWith(fullHref);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={fullHref}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-zinc-800 text-white font-medium'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-zinc-500')} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.href === '/inbox' && inboxCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600/80 px-1 text-[10px] font-bold text-white leading-none">
                  {inboxCount > 99 ? '99+' : inboxCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
