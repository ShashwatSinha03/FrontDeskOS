'use client';

import { useEffect, useRef, useState } from 'react';
import { SolutionContent } from '@/lib/marketing-content';
import { Radio } from 'lucide-react';

export function SolutionSection({ headline, items }: SolutionContent) {
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

  return (
    <section className="border-t border-zinc-800 bg-black py-24 sm:py-32">
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

        <div className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-2">
          {items.map((item, i) => (
            <div
              key={i}
              className={`rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all duration-700 hover:border-zinc-700 hover:bg-zinc-900/80 ${
                visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              }`}
              style={{ transitionDelay: visible ? `${500 + i * 120}ms` : '0ms' }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/50">
                <Radio className="h-4 w-4 text-blue-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white">{item.label}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
