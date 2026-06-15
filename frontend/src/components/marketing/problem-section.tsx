'use client';

import { Reveal } from '@/components/design/reveal';
import { ProblemContent } from '@/lib/marketing-content';

export function ProblemSection({ headline, problems, result }: ProblemContent) {
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

        <div className="mx-auto mt-16 grid max-w-3xl gap-3">
          {problems.map((problem, i) => (
            <Reveal key={i} delay={i * 100} y={10} duration={600}>
              <div className="group relative rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-6 py-5 transition-colors hover:border-zinc-700/60">
                <div className="absolute left-0 top-0 h-full w-0.5 rounded-full bg-red-500/0 transition-colors group-hover:bg-red-500/50" />
                <p className="text-base leading-relaxed text-zinc-400 transition-colors group-hover:text-zinc-300">
                  {problem.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={500} y={10}>
          <div className="mx-auto mt-12 max-w-2xl text-center">
            <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
            <p className="mt-8 text-2xl font-semibold tracking-tight text-red-400/90 sm:text-3xl">
              {result}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
