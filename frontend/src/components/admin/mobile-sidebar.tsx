'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { getInboxCounts } from '@/lib/api/ops';
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
  Menu,
} from 'lucide-react';

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

export function MobileSidebar({ businessName, slug }: { businessName: string; slug: string }) {
  const pathname = usePathname();
  const basePath = `/${slug}/admin`;
  const [open, setOpen] = useState(false);
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="md:hidden rounded-md border p-2 text-muted-foreground hover:bg-muted transition-colors" aria-label="Menu">
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
        <SheetContent side="left" className="w-56 p-0">
          <div className="flex h-14 items-center px-5">
          <Link href={`/${slug}`} className="text-sm font-semibold tracking-tight text-foreground/80">
            {businessName}
          </Link>
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
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
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/[0.08] text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.href === '/inbox' && inboxCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                    {inboxCount > 99 ? '99+' : inboxCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
