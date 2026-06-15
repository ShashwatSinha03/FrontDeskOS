'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LogoWithName } from '@/components/ui/logo';
import {
  LayoutDashboard,
  Building2,
  Users,
  Rocket,
  Heart,
  Search,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Overview', href: '/ops', icon: LayoutDashboard, exact: true },
  { label: 'Businesses', href: '/ops/businesses', icon: Building2 },
  { label: 'Users', href: '/ops/users', icon: Users },
  { label: 'Onboarding', href: '/ops/onboarding', icon: Rocket },
  { label: 'Pilot Health', href: '/ops/pilot', icon: Heart },
  { label: 'Support', href: '/ops/support', icon: Search },
];

export function FounderSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r bg-card shrink-0 hidden md:flex flex-col">
      <div className="flex h-14 items-center gap-2.5 border-b px-5">
        <Link href="/ops" className="flex items-center gap-2">
          <LogoWithName className="text-lg text-foreground" />
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
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-foreground/[0.06] text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? 'text-foreground' : 'text-muted-foreground')} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-muted-foreground">Founder Access</span>
        </div>
      </div>
    </aside>
  );
}
