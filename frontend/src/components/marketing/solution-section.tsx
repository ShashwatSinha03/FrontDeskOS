'use client';

import { Reveal } from '@/components/design/reveal';
import { SolutionContent } from '@/lib/marketing-content';

export function SolutionSection({ headline, items }: SolutionContent) {
  return (
    <section className="border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {headline}
            </h2>
          </div>
        </Reveal>

        <div className="mx-auto mt-16 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <Reveal key={i} delay={i * 80} y={10} duration={600}>
              <div className="group rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-5 py-5 transition-all hover:border-zinc-700/60 hover:bg-zinc-900/50">
                <h3 className="text-sm font-semibold text-white">{item.label}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-400">
                  {item.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
