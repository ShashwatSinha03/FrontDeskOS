import Link from 'next/link';
import BorderGlow from '@/components/BorderGlow';
import { CtaContent } from '@/lib/marketing-content';
import { Calendar, Mail, Phone } from 'lucide-react';

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
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {headline}
          </h2>

          <div className="mt-6 space-y-4">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-base leading-relaxed text-zinc-400 sm:text-lg">
                {p}
              </p>
            ))}
          </div>

          <div className="mt-10 inline-block">
            <BorderGlow
              edgeSensitivity={30}
              glowColor="40 80 80"
              backgroundColor="#000"
              borderRadius={12}
              glowRadius={12}
              glowIntensity={1}
              coneSpread={25}
              animated={false}
              colors={['#c084fc', '#f472b6', '#38bdf8']}
            >
              <Link
                href={primaryHref}
                className="inline-flex items-center gap-2.5 px-8 py-4 text-base font-semibold text-white sm:text-lg"
              >
                <Calendar className="h-5 w-5" />
                {primaryCta.label}
              </Link>
            </BorderGlow>
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
