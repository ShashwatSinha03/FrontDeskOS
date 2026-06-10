import Link from 'next/link';
import PixelCard from '@/components/PixelCard';
import { HeroContent } from '@/lib/marketing-content';
import { ArrowRight, MessageSquare, CalendarCheck, UserCheck } from 'lucide-react';
import LightRays from '@/components/LightRays';

function FlowStep({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50">
        <Icon className="h-5 w-5 text-blue-400" />
      </div>
      <span className="text-sm text-zinc-300">{label}</span>
    </div>
  );
}

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
            <Link
              href={primaryCta.href}
              className="relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black"
            >
              <PixelCard
                variant="pink"
                className="absolute inset-0 !h-full !w-full !rounded-none !border-0"
              />
              <span className="relative z-10">{primaryCta.label}</span>
              <ArrowRight className="relative z-10 h-4 w-4" />
            </Link>
            <Link
              href={secondaryCta.href}
              className="relative inline-flex items-center gap-2 overflow-hidden rounded-xl border border-zinc-800 px-6 py-3 text-sm font-medium text-zinc-300"
            >
              <PixelCard
                variant="pink"
                className="absolute inset-0 !h-full !w-full !rounded-none !border-0"
              />
              <span className="relative z-10">{secondaryCta.label}</span>
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-20 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          <FlowStep icon={MessageSquare} label="Lead" />
          <ArrowRight className="h-4 w-4 text-zinc-600" />
          <FlowStep icon={CalendarCheck} label="Appointment" />
          <ArrowRight className="h-4 w-4 text-zinc-600" />
          <FlowStep icon={UserCheck} label="Customer" />
        </div>
      </div>
    </section>
  );
}
