import Link from 'next/link';
import { CtaContent } from '@/lib/marketing-content';
import { ArrowRight, Mail, Phone } from 'lucide-react';

function buildMailtoHref(mailto: { to: string; subject: string; body: string }): string {
  return `mailto:${mailto.to}?subject=${encodeURIComponent(mailto.subject)}&body=${encodeURIComponent(mailto.body)}`;
}

export function FinalCta({ headline, subheadline, primaryCta, secondaryActions }: CtaContent) {
  const primaryHref = primaryCta.mailto
    ? buildMailtoHref(primaryCta.mailto)
    : primaryCta.href;

  const paragraphs = subheadline.split('\n\n').filter(Boolean);

  return (
    <section id="cta" className="border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {headline}
          </h2>

          <div className="mt-6 space-y-4">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-base leading-relaxed text-zinc-400 sm:text-lg">
                {p}
              </p>
            ))}
          </div>

          <div className="mt-10">
            <Link
              href={primaryHref}
              className="inline-flex items-center gap-2.5 rounded-xl bg-white px-8 py-4 text-base font-semibold text-black shadow-lg transition hover:bg-zinc-200 sm:text-lg"
            >
              {primaryCta.label}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-zinc-600">
            <a
              href={`mailto:${secondaryActions.email}`}
              className="inline-flex items-center gap-1.5 transition hover:text-zinc-400"
            >
              <Mail className="h-3.5 w-3.5" />
              {secondaryActions.email}
            </a>
            <span className="text-zinc-700">|</span>
            <a
              href={`tel:${secondaryActions.phone.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-1.5 transition hover:text-zinc-400"
            >
              <Phone className="h-3.5 w-3.5" />
              {secondaryActions.phone}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
