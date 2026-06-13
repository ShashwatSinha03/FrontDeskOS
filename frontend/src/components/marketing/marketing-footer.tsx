import Link from 'next/link';
import { Mail, Phone, ArrowUpRight } from 'lucide-react';

const PRODUCT_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Industries', href: '#industries' },
  { label: 'Book a Demo', href: '#cta' },
];

const INDUSTRIES_LINKS = [
  { label: 'Dental Clinics', href: '#industries' },
  { label: 'Salons & Spas', href: '#industries' },
  { label: 'Gyms & Fitness', href: '#industries' },
  { label: 'Wellness Centers', href: '#industries' },
  { label: 'Medical Practices', href: '#industries' },
  { label: 'Service Businesses', href: '#industries' },
];

const COMPANY_LINKS = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
];

export function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-800 bg-black">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link href="/" className="text-lg font-semibold tracking-tight text-white">
              Nevura
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500 max-w-xs">
              The 24/7 AI receptionist that answers questions, captures leads, books appointments, and follows up automatically.
            </p>
            <div className="mt-5 flex flex-col gap-2 text-sm text-zinc-500">
              <a
                href="mailto:sinhashashwat21@gmail.com"
                className="inline-flex items-center gap-2 hover:text-zinc-300 transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                sinhashashwat21@gmail.com
              </a>
              <a
                href="tel:+916307234110"
                className="inline-flex items-center gap-2 hover:text-zinc-300 transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                +91 63072 34110
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Industries</h4>
            <ul className="space-y-2.5">
              {INDUSTRIES_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            &copy; {currentYear} Nevura. All rights reserved.
          </p>
          <p className="text-xs text-zinc-600">
            Built for businesses that never want to miss another customer.
          </p>
        </div>
      </div>
    </footer>
  );
}
