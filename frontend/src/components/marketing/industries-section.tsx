import { IndustriesContent } from '@/lib/marketing-content';
import { SmilePlus, Scissors, Dumbbell, Sparkles, Heart, Building2 } from 'lucide-react';

const industryIcons = [SmilePlus, Scissors, Dumbbell, Sparkles, Heart, Building2];

export function IndustriesSection({ headline, industries }: IndustriesContent) {
  return (
    <section className="border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {headline}
        </h2>

        <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((industry, i) => {
            const Icon = industryIcons[i] || Building2;
            return (
              <div
                key={i}
                className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 transition hover:border-zinc-700"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800/50">
                  <Icon className="h-5 w-5 text-zinc-400" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-white">{industry.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">{industry.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
