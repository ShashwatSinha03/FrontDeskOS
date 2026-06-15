'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Reveal } from '@/components/design/reveal';
import BorderGlow from '@/components/BorderGlow';
import { HeroContent } from '@/lib/marketing-content';
import { ArrowRight, MessageSquare, CalendarCheck, UserCheck } from 'lucide-react';
import LightRays from '@/components/LightRays';

function FlowStep({ icon: Icon, label, visible, delay }: { icon: any; label: string; visible: boolean; delay: number }) {
  return (
    <div
      className={`flex items-center gap-3 transition-all duration-500 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
      style={{ transitionDelay: `${delay}ms`, transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
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
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const glowProps = {
    edgeSensitivity: 30,
    glowColor: '40 80 80' as const,
    backgroundColor: '#000',
    borderRadius: 12,
    glowRadius: 12,
    glowIntensity: 1,
    coneSpread: 25,
    animated: false,
    colors: ['#c084fc', '#f472b6', '#38bdf8'] as string[],
  };

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
            <BorderGlow {...glowProps}>
              <Link
                href={primaryCta.href}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white"
              >
                {primaryCta.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </BorderGlow>
            <BorderGlow {...glowProps}>
              <Link
                href={secondaryCta.href}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-zinc-300"
              >
                {secondaryCta.label}
              </Link>
            </BorderGlow>
          </div>
        </div>

        <div ref={ref} className="mx-auto mt-20 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          <FlowStep icon={MessageSquare} label="Lead" visible={visible} delay={0} />
          <ArrowRight
            className={`h-4 w-4 text-zinc-600 transition-all duration-500 ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
            style={{ transitionDelay: '0ms', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
          <FlowStep icon={CalendarCheck} label="Appointment" visible={visible} delay={200} />
          <ArrowRight
            className={`h-4 w-4 text-zinc-600 transition-all duration-500 ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
            style={{ transitionDelay: '200ms', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
          <FlowStep icon={UserCheck} label="Customer" visible={visible} delay={400} />
        </div>
      </div>
    </section>
  );
}
