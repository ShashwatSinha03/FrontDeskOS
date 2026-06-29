'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Home', href: '' },
  { label: 'Services', href: '/services' },
  { label: 'Contact', href: '/contact' },
];

export function Header({ businessName, slug, description }: { businessName: string; slug: string; description?: string | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '') return pathname === `/${slug}`;
    return pathname.startsWith(`/${slug}${href}`);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800 shadow-sm'
          : 'bg-transparent border-b border-transparent'
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={`/${slug}`} className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
            <span className="text-xs font-bold text-white">{businessName.charAt(0)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight leading-tight text-white">{businessName}</span>
            {description && (
              <span className="text-[10px] leading-tight text-zinc-400 truncate max-w-[180px] lg:max-w-[240px]">
                {description}
              </span>
            )}
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={`/${slug}${item.href}`}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive(item.href)
                  ? 'text-white bg-zinc-800'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              )}
            >
              {item.label}
            </Link>
          ))}
          <div className="ml-4">
            <Link href={`/${slug}/book`}>
              <Button size="sm" className="bg-blue-600/80 text-white hover:bg-blue-500/80">Book Appointment</Button>
            </Link>
          </div>
        </nav>

        <div className="flex items-center gap-3 md:hidden">
          <Link href={`/${slug}/book`}>
            <Button size="sm">Book</Button>
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="relative h-9 w-9 flex items-center justify-center rounded-md hover:bg-zinc-800 transition-colors"
            aria-label="Toggle menu"
          >
            <div className="relative h-5 w-5">
              <span
                className={cn(
                  'absolute left-0 top-0.5 h-px w-full bg-white transition-all duration-300',
                  mobileOpen && 'top-2 rotate-45'
                )}
              />
              <span
                className={cn(
                  'absolute left-0 top-2.5 h-px w-full bg-white transition-all duration-300',
                  mobileOpen && 'opacity-0'
                )}
              />
              <span
                className={cn(
                  'absolute left-0 top-[calc(20px-4.5px)] h-px w-full bg-white transition-all duration-300',
                  mobileOpen && 'top-2 -rotate-45'
                )}
              />
            </div>
          </button>
        </div>
      </div>

      <div
        className={cn(
          'md:hidden overflow-hidden transition-all duration-300 ease-in-out',
          mobileOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <nav className="flex flex-col gap-1 border-t border-zinc-800 bg-zinc-950 px-4 py-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={`/${slug}${item.href}`}
              className={cn(
                'px-3 py-2.5 text-sm font-medium rounded-md transition-colors',
                isActive(item.href)
                  ? 'text-white bg-zinc-800'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
