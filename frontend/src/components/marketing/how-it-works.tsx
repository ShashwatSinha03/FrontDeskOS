'use client';

import { Reveal } from '@/components/design/reveal';
import { HowItWorksContent } from '@/lib/marketing-content';

export function HowItWorks({ headline, steps }: HowItWorksContent) {
  return (
    <section id="how-it-works" className="border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {headline}
          </h2>
        </Reveal>

        <div className="relative mx-auto mt-16 max-w-3xl">
          <div className="absolute left-6 top-0 h-full w-px bg-gradient-to-b from-zinc-700 via-zinc-800 to-transparent" />
          <div className="space-y-12">
            {steps.map((step, i) => (
              <Reveal key={step.number} delay={i * 100} y={10} duration={600}>
                <div className="relative pl-16">
                  <div className="absolute left-0 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-sm font-bold text-white ring-8 ring-black transition-colors hover:border-zinc-600">
                    {step.number}
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{step.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
