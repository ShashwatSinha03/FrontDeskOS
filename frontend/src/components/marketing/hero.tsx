'use client';

import { HeroContent } from '@/lib/marketing-content';
import { ArrowRight } from 'lucide-react';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import dynamic from 'next/dynamic';

const LightRays = dynamic(() => import('@/components/LightRays'), { ssr: false });

export function HomeHero({
  headline,
  subheadline,
  primaryCta,
  secondaryCta,
}: HeroContent) {

  return (
    <section className="relative min-h-screen overflow-hidden bg-black">
      <div className="absolute inset-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#3b85ff"
          raysSpeed={0.6}
          lightSpread={1.3}
          rayLength={2.1}
          followMouse={true}
          mouseInfluence={0.2}
          noiseAmount={0.28}
          distortion={0}
          pulsating
          fadeDistance={1}
          saturation={1.1}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-4 pb-32 pt-24 sm:px-6 sm:pb-40 sm:pt-32 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-bold tracking-tighter text-white sm:text-6xl lg:text-7xl">
            {headline}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-zinc-400 sm:text-xl sm:leading-relaxed">
            {subheadline}
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <ShimmerButton href={primaryCta.href}>
              {primaryCta.label}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/button:translate-x-0.5" />
            </ShimmerButton>
            <ShimmerButton href={secondaryCta.href}>
              {secondaryCta.label}
            </ShimmerButton>
          </div>
        </div>
      </div>
    </section>
  );
}
