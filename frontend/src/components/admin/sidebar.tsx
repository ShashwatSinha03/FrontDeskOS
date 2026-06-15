'use client';

import Link from 'next/link';
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
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '', icon: LayoutDashboard },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Leads', href: '/leads', icon: Users },
  { label: 'Appointments', href: '/appointments', icon: CalendarCheck },
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

  return (
    <aside className="w-56 border-r bg-card shrink-0 hidden md:flex flex-col">
      <div className="flex h-14 items-center border-b px-5">
        <Link href={`/${slug}`} className="text-sm font-semibold tracking-tight text-foreground/80 hover:text-foreground transition-colors">
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
                  ? 'bg-primary/[0.08] text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
