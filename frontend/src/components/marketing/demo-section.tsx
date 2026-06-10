'use client';

import { useEffect, useRef, useState } from 'react';
import DotGrid from '@/components/DotGrid';
import { DemoContent } from '@/lib/marketing-content';

export function DemoSection({ headline, messages }: DemoContent) {
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

  return (
    <section className="relative overflow-hidden border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="absolute inset-0">
        <DotGrid
          dotSize={6}
          gap={21}
          baseColor="#2a3a5c"
          activeColor="#1f74ff"
          proximity={150}
          shockRadius={200}
          shockStrength={9}
          resistance={1750}
          returnDuration={4.3}
        />
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-black to-transparent" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {headline}
          </h2>
        </div>

        <div className="mx-auto mt-16 flex justify-center">
          <div
            ref={ref}
            className="max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900/85 p-4 sm:p-6"
          >
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs font-medium text-zinc-400">AI Receptionist · Live</span>
              <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-green-500" />
            </div>

            <div className="mt-4 space-y-4">
              {messages.map((msg, i) => {
                const isCustomer = msg.sender === 'customer';
                return (
                  <div
                    key={i}
                    className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed transition-all duration-1000 ${
                        isCustomer
                          ? 'rounded-bl-sm bg-zinc-800 text-zinc-200'
                          : 'rounded-br-sm bg-blue-600 text-white'
                      } ${visible ? 'translate-x-0 opacity-100' : `${isCustomer ? '-translate-x-6' : 'translate-x-6'} opacity-0`}`}
                      style={{
                        transitionDelay: visible ? `${i * 850}ms` : '0ms',
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
