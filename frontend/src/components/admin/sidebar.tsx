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
  CreditCard,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '', icon: LayoutDashboard },
  { label: 'Leads', href: '/leads', icon: Users },
  { label: 'Appointments', href: '/appointments', icon: CalendarCheck },
  { label: 'Follow-Ups', href: '/follow-ups', icon: Mail },
  { label: 'Escalations', href: '/escalations', icon: AlertTriangle },
  { label: 'Learning Inbox', href: '/learning-inbox', icon: BookOpen },
  { label: 'Team', href: '/settings?tab=team', icon: Users },
  { label: 'Billing', href: '/billing', icon: CreditCard },
];

export function AdminSidebar({ businessName, slug }: { businessName: string; slug: string }) {
  const pathname = usePathname();
  const basePath = `/${slug}/admin`;

  return (
    <aside className="w-56 border-r bg-card shrink-0 hidden md:flex flex-col">
      <div className="flex h-14 items-center border-b px-5">
        <Link href={`/${slug}`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          {businessName}
        </Link>
      </div>
      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {NAV_ITEMS.map((item) => {
          const fullHref = `${basePath}${item.href}`;
          const fullPath = fullHref.split('?')[0];
          const isActive = pathname === fullPath || (item.href === '' && pathname === basePath);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={fullHref}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
