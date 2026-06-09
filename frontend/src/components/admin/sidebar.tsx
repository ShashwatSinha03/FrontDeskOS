'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Mail,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '', icon: LayoutDashboard },
  { label: 'Leads', href: '/leads', icon: Users },
  { label: 'Appointments', href: '/appointments', icon: CalendarCheck },
  { label: 'Follow-Ups', href: '/follow-ups', icon: Mail },
  { label: 'Escalations', href: '/escalations', icon: AlertTriangle },
  { label: 'Learning Inbox', href: '/learning-inbox', icon: BookOpen },
];

export function AdminSidebar({ businessName, slug }: { businessName: string; slug: string }) {
  const pathname = usePathname();
  const basePath = `/${slug}/admin`;

  return (
    <aside className="w-64 border-r bg-white shrink-0 hidden md:block">
      <div className="flex h-16 items-center border-b px-6">
        <Link href={`/${slug}`} className="font-semibold text-sm text-muted-foreground hover:text-foreground">
          {businessName}
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-4">
        {NAV_ITEMS.map((item) => {
          const fullHref = `${basePath}${item.href}`;
          const isActive = pathname === fullHref || (item.href === '' && pathname === basePath);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={fullHref}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
