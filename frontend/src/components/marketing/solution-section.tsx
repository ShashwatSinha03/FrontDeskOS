'use client';

import { Reveal } from '@/components/design/reveal';
import { SolutionContent } from '@/lib/marketing-content';
import { Globe, Zap, Calendar, HelpCircle, Repeat, AlertTriangle, UserCheck, LayoutDashboard, Rocket } from 'lucide-react';

const icons = [Globe, Zap, Calendar, HelpCircle, Repeat, AlertTriangle, UserCheck, LayoutDashboard, Rocket];

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
          {items.map((item, i) => {
            const Icon = icons[i] || Rocket;
            return (
              <Reveal key={i} delay={i * 80} y={10} duration={600}>
                <div className="group relative h-full rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-5 py-5 transition-all hover:border-blue-500/20 hover:bg-zinc-900/50">
                  <div className="absolute left-0 top-2 h-[calc(100%-1rem)] w-0.5 rounded-full bg-blue-500/0 transition-colors group-hover:bg-blue-500/40" />
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-700/40 bg-zinc-800/40 transition-colors group-hover:border-blue-500/30 group-hover:bg-blue-500/10">
                      <Icon className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-blue-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">{item.label}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-400">
                    {item.description}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
