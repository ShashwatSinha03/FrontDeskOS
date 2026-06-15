'use client';

import { Reveal } from '@/components/design/reveal';
import { ShowcaseContent } from '@/lib/marketing-content';
import { MessageSquare, LayoutDashboard, CalendarCheck, AlertTriangle, Repeat } from 'lucide-react';

const icons = [MessageSquare, LayoutDashboard, CalendarCheck, AlertTriangle, Repeat];

export function ProductShowcase({ headline, items }: ShowcaseContent) {
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

        <div className="mx-auto mt-16 grid max-w-5xl gap-px overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => {
            const Icon = icons[i] || MessageSquare;
            return (
              <Reveal key={i} delay={i * 80} y={8} duration={500}>
                <div className="h-full bg-zinc-900/90 p-6 transition hover:bg-zinc-900">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700/60 bg-zinc-800/50">
                    <Icon className="h-5 w-5 text-zinc-400 transition-colors group-hover:text-blue-400" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-white">{item.label}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{item.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
