'use client';

import { useEffect, useRef, useState } from 'react';
import { IndustriesContent } from '@/lib/marketing-content';
import { Stethoscope, Scissors, Dumbbell, Sparkles, Heart, Building2 } from 'lucide-react';

const industryIcons = [Stethoscope, Scissors, Dumbbell, Sparkles, Heart, Building2];

function Counter({ target, visible }: { target: number; visible: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const duration = 1200;
    const steps = 20;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [visible, target]);

  return <span>{count}</span>;
}

function TypingDots({ visible }: { visible: boolean }) {
  return (
    <span className={`ml-0.5 inline-flex ${visible ? '' : 'invisible'}`}>
      <span className="h-1 w-1 animate-pulse rounded-full bg-zinc-500" style={{ animationDelay: '0ms' }} />
      <span className="ml-0.5 h-1 w-1 animate-pulse rounded-full bg-zinc-500" style={{ animationDelay: '200ms' }} />
      <span className="ml-0.5 h-1 w-1 animate-pulse rounded-full bg-zinc-500" style={{ animationDelay: '400ms' }} />
    </span>
  );
}

function BlinkingCursor({ visible }: { visible: boolean }) {
  return (
    <span className={`ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-blue-400 ${visible ? '' : 'invisible'}`} />
  );
}

function CheckIn({ text, delay, visible }: { text: string; delay: number; visible: boolean }) {
  return (
    <div
      className={`mt-2 flex items-center gap-1.5 text-xs text-emerald-400 transition-all duration-500 ${
        visible ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'
      }`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {text}
    </div>
  );
}

function PulseDot({ visible }: { visible: boolean }) {
  return (
    <span className={`ml-auto flex h-2 w-2 ${visible ? '' : 'invisible'}`}>
      <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
    </span>
  );
}

export function IndustriesSection({ headline, industries }: IndustriesContent) {
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
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cardAnimations = [
    { name: 'Dental Clinics', badge: <CheckIn text="New inquiry received" delay={600} visible={visible} />, extra: null },
    { name: 'Salons', badge: <><span className="text-xs text-zinc-500">AI is typing</span><TypingDots visible={visible} /></>, extra: <BlinkingCursor visible={visible} /> },
    { name: 'Gyms', badge: <span className="text-xs text-zinc-500"><Counter target={12} visible={visible} /> members this week</span>, extra: null },
    { name: 'Spas', badge: <CheckIn text="Appointment confirmed" delay={800} visible={visible} />, extra: null },
    { name: 'Wellness Clinics', badge: null, extra: <PulseDot visible={visible} /> },
    { name: 'Service Businesses', badge: <span className="text-xs text-zinc-500"><Counter target={47} visible={visible} /> leads captured</span>, extra: null },
  ];

  return (
    <section id="industries" className="border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            ref={ref}
            className={`text-3xl font-bold tracking-tight text-white transition-all duration-700 sm:text-4xl ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            {headline}
          </h2>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((industry, i) => {
            const Icon = industryIcons[i] || Building2;
            const anim = cardAnimations[i];
            return (
              <div
                key={i}
                className={`rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 opacity-0 transition-all duration-700 hover:border-zinc-700 hover:bg-zinc-900/80 ${
                  visible ? 'opacity-100' : ''
                }`}
                style={{ transitionDelay: visible ? `${i * 150}ms` : '0ms' }}
              >
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/50">
                    <Icon className="h-5 w-5 text-zinc-400" />
                  </div>
                  {anim?.extra}
                </div>
                <h3 className="mt-4 text-sm font-semibold text-white">{industry.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{industry.description}</p>
                {anim?.badge && <div className="mt-2">{anim.badge}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
