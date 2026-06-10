'use client';

import { useEffect, useRef, useState } from 'react';
import { HowItWorksContent } from '@/lib/marketing-content';

export function HowItWorks({ headline, steps }: HowItWorksContent) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
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

  return (
    <section id="how-it-works" className="border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2
          ref={sectionRef}
          className={`text-center text-3xl font-bold tracking-tight text-white sm:text-4xl transition-all duration-700 ${
            visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          {headline}
        </h2>

        <div className="relative mx-auto mt-16 max-w-3xl">
          <div className="absolute left-6 top-0 h-full w-px bg-zinc-800" />
          <div className="space-y-12">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className={`relative pl-16 transition-all duration-700 ${
                  visible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-3 opacity-0'
                }`}
                style={{ transitionDelay: visible ? `${400 + i * 120}ms` : '0ms' }}
              >
                <div className="absolute left-0 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-sm font-bold text-white ring-8 ring-black">
                  {step.number}
                </div>
                <div className="pt-1.5">
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
