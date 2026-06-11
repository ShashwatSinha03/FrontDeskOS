'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Users,
  Rocket,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Overview', href: '/ops', icon: LayoutDashboard, exact: true },
  { label: 'Businesses', href: '/ops/businesses', icon: Building2 },
  { label: 'Users', href: '/ops/users', icon: Users },
  { label: 'Onboarding', href: '/ops/onboarding', icon: Rocket },
];

export function FounderSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r bg-card shrink-0 hidden md:flex flex-col">
      <div className="flex h-14 items-center border-b px-5">
        <Link href="/ops" className="text-sm font-semibold tracking-tight">
          FrontDeskOS
        </Link>
      </div>
      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
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
      <div className="border-t px-5 py-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Founder
        </span>
      </div>
    </aside>
  );
}
