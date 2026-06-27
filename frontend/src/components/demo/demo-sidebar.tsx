'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDemo, useDemoStore } from '@/lib/demo/stores/demo-provider';
import { LayoutDashboard, BarChart3, CalendarCheck, AlertTriangle, MessageSquare, DollarSign, ArrowLeft } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Overview', href: '/demo/dashboard', icon: LayoutDashboard },
  { label: 'Conversations', href: '/demo/dashboard/conversations', icon: MessageSquare },
  { label: 'Appointments', href: '/demo/dashboard/appointments', icon: CalendarCheck },
  { label: 'Escalations', href: '/demo/dashboard/escalations', icon: AlertTriangle },
  { label: 'Analytics', href: '/demo/dashboard/analytics', icon: BarChart3 },
  { label: 'Costs', href: '/demo/dashboard/costs', icon: DollarSign },
];

export function DemoDashboardSidebar() {
  const pathname = usePathname();
  const { dashboard, notifications } = useDemo();
  const metrics = useDemoStore(dashboard, () => dashboard.metrics);
  const unread = useDemoStore(notifications, () => notifications.unread);

  return (
    <aside className="flex w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-6 py-4">
        <Link href="/demo/apex-dental" className="text-sm font-semibold text-white hover:text-blue-400">
          ← Apex Dental
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600/10 text-blue-400'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {label === 'Escalations' && metrics.escalationsPending > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
                  {metrics.escalationsPending}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-800 px-3 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Exit Demo</span>
        </Link>
      </div>
    </aside>
  );
}
