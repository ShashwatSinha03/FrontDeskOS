import Link from 'next/link';
import { CtaContent } from '@/lib/marketing-content';
import { ArrowRight } from 'lucide-react';

export function FinalCta({ headline, subheadline, primaryCta }: CtaContent) {
  return (
    <section id="cta" className="border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {headline}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            {subheadline}
          </p>
          <div className="mt-10">
            <Link
              href={primaryCta.href}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              {primaryCta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
