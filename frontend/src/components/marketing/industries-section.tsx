'use client';

import { Reveal } from '@/components/design/reveal';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { IndustriesContent } from '@/lib/marketing-content';
import { Stethoscope, Scissors, Dumbbell, Sparkles, Heart, Building2 } from 'lucide-react';

const industryIcons = [Stethoscope, Scissors, Dumbbell, Sparkles, Heart, Building2];

export function IndustriesSection({ headline, industries }: IndustriesContent) {
  return (
    <section id="industries" className="border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {headline}
            </h2>
          </div>
        </Reveal>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((industry, i) => {
            const Icon = industryIcons[i] || Building2;
            return (
              <Reveal key={i} delay={i * 80} y={8} duration={500}>
                <SpotlightCard className="p-5 group h-full" spotlightColor="rgba(59, 130, 246, 0.15)">
                  <div className="flex flex-col items-center text-center h-full">
                    <div className="mb-3">
                      <div className="p-2.5 rounded-full border border-neutral-700 bg-neutral-800/50 shadow-lg transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                        <Icon className="h-5 w-5 text-zinc-300" />
                      </div>
                    </div>
                    <h3 className="mb-1.5 text-sm font-bold bg-gradient-to-r from-blue-400/80 via-blue-300/80 to-blue-400/80 bg-clip-text text-transparent">
                      {industry.name}
                    </h3>
                    <p className="text-zinc-400 text-sm leading-relaxed transition-colors duration-300 group-hover:text-zinc-300 max-w-sm flex-1">
                      {industry.description}
                    </p>
                    <div className="mt-4 w-1/3 h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent rounded-full transition-all duration-500 group-hover:w-1/2" />
                    <div className="flex space-x-1.5 mt-2 opacity-40 transition-opacity duration-300 group-hover:opacity-70">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    </div>
                  </div>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
