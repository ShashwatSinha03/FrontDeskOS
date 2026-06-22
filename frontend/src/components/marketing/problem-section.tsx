'use client';

import { ProblemContent } from '@/lib/marketing-content';
import { XCircle, ArrowDown } from 'lucide-react';
import dynamic from 'next/dynamic';

const MagicRings = dynamic(() => import('@/components/MagicRings'), { ssr: false });

export function ProblemSection({ headline, problems, result }: ProblemContent) {
  return (
    <section className="relative border-t border-zinc-800 bg-black py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0">
        <MagicRings
          color="#b11d1d"
          colorTwo="#b32727"
          ringCount={6}
          speed={1.6}
          attenuation={16.5}
          lineThickness={2}
          baseRadius={0.35}
          radiusStep={0.1}
          scaleRate={0.1}
          opacity={0.7}
          blur={0}
          noiseAmount={0.1}
          rotation={0}
          ringGap={1.5}
          fadeIn={0.7}
          fadeOut={0.5}
          followMouse={false}
          mouseInfluence={0.2}
          hoverScale={1.2}
          parallax={0.05}
          clickBurst={false}
        />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {headline}
          </h2>
        </div>

        <div className="mx-auto mt-16 max-w-lg space-y-3">
          {problems.map((problem, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/70 px-5 py-4 backdrop-blur-sm transition hover:border-zinc-700"
            >
              <XCircle className="h-5 w-5 shrink-0 text-red-400" />
              <span className="text-base text-zinc-300">{problem.text}</span>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 flex max-w-lg items-center justify-center gap-4 text-zinc-600">
          <div className="h-px flex-1 bg-zinc-800" />
          <ArrowDown className="h-5 w-5 shrink-0" />
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <p className="mx-auto mt-8 max-w-lg text-center text-2xl font-semibold tracking-tight text-red-400">
          {result}
        </p>
      </div>
    </section>
  );
}
