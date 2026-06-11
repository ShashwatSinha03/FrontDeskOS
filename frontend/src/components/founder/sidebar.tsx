'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarCheck,
  AlertTriangle,
  CreditCard,
  Activity,
  PlusCircle,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Overview', href: '/ops', icon: LayoutDashboard },
  { label: 'Businesses', href: '/ops/businesses', icon: Building2 },
  { label: 'Leads', href: '/ops/leads', icon: Users },
  { label: 'Appointments', href: '/ops/appointments', icon: CalendarCheck },
  { label: 'Escalations', href: '/ops/escalations', icon: AlertTriangle },
  { label: 'Subscriptions', href: '/ops/subscriptions', icon: CreditCard },
  { label: 'Activity', href: '/ops/activity', icon: Activity },
];

export function FounderSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r bg-card shrink-0 hidden md:flex flex-col">
      <div className="flex h-14 items-center border-b px-5">
        <Link href="/ops" className="text-sm font-semibold tracking-tight">
          Founder OS
        </Link>
      </div>
      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/ops'
              ? pathname === '/ops'
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
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
      <div className="border-t p-3">
        <Link
          href="/ops/onboarding"
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Onboard Business
        </Link>
      </div>
    </aside>
  );
}
