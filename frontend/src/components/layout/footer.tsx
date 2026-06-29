import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';
import { LogoWithName } from '@/components/ui/logo';

const NAV_LINKS = [
  { label: 'Home', href: '' },
  { label: 'Services', href: '/services' },
  { label: 'Book Appointment', href: '/book' },
  { label: 'Contact', href: '/contact' },
];

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Acceptable Use', href: '/acceptable-use' },
];

export function Footer({ businessName, slug }: { businessName: string; slug?: string }) {
  const currentYear = new Date().getFullYear();

  const prefix = slug ? `/${slug}` : '';

  const navLinks = NAV_LINKS.map((link) => ({
    ...link,
    href: link.href === '' ? prefix || '/' : `${prefix}${link.href}`,
  }));

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold tracking-tight">{businessName}</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              {businessName} — professional service tailored to you.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">Navigation</h4>
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">Legal</h4>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {currentYear} {businessName}. All rights reserved.
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Link href="/privacy" className="underline hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="underline hover:text-foreground transition-colors">Terms</Link>
            <Link href="/acceptable-use" className="underline hover:text-foreground transition-colors">AUP</Link>
            <span className="flex items-center gap-1.5">
              Powered by <LogoWithName className="inline-block text-base align-middle font-normal" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
