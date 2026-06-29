'use client';

import { Reveal } from '@/components/design/reveal';
import { CtaContent } from '@/lib/marketing-content';
import { Calendar, Mail, Phone } from 'lucide-react';
import { ShimmerButton } from '@/components/ui/shimmer-button';

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
          <Reveal>
            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {headline}
            </h2>
          </Reveal>

          <Reveal delay={150} y={10}>
            <div className="mt-6 space-y-4">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-base leading-relaxed text-zinc-400 sm:text-lg">
                  {p}
                </p>
              ))}
            </div>
          </Reveal>

          <Reveal delay={300} y={10}>
            <div className="mt-10 inline-block">
              <ShimmerButton href={primaryHref}>
                <Calendar className="h-5 w-5" />
                {primaryCta.label}
              </ShimmerButton>
            </div>
          </Reveal>

          <Reveal delay={450} y={10}>
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
          </Reveal>
        </div>
      </div>
    </section>
  );
}
