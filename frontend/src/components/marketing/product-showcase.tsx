'use client';

import { Reveal } from '@/components/design/reveal';
import { HighlightCard } from '@/components/ui/highlight-card';
import { ShowcaseContent } from '@/lib/marketing-content';
import { MessageSquare, LayoutDashboard, CalendarCheck, Globe, Repeat, BarChart3 } from 'lucide-react';

const icons = [MessageSquare, LayoutDashboard, CalendarCheck, Globe, Repeat, BarChart3];

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

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => {
            const Icon = icons[i] || MessageSquare;
            return (
              <Reveal key={i} delay={i * 80} y={8} duration={500}>
                <HighlightCard
                  title={item.label}
                  description={[item.description]}
                  icon={<Icon className="h-6 w-6 text-zinc-300" />}
                />
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
