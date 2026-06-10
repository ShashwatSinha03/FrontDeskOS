import { ShowcaseContent } from '@/lib/marketing-content';
import { MessageSquare, LayoutDashboard, CalendarCheck, AlertTriangle, Repeat } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

const icons = [MessageSquare, LayoutDashboard, CalendarCheck, AlertTriangle, Repeat];

export function ProductShowcase({ headline, items }: ShowcaseContent) {
  return (
    <section className="border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {headline}
          </h2>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => {
            const Icon = icons[i] || MessageSquare;
            return (
              <SpotlightCard key={i} className="group">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/50">
                  <Icon className="h-5 w-5 text-zinc-400 transition group-hover:text-blue-400" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-white">{item.label}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{item.description}</p>
              </SpotlightCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
