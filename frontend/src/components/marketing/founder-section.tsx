'use client';

import { useRef } from 'react';
import { Reveal } from '@/components/design/reveal';
import { FounderContent } from '@/lib/marketing-content';

export function FounderSection({ headline, name, title, story }: FounderContent) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -4;
    const rotateY = ((x - centerX) / centerX) * 4;
    card.style.setProperty('--rx', `${rotateX}deg`);
    card.style.setProperty('--ry', `${rotateY}deg`);
  }

  function handleMouseLeave() {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  }

  return (
    <section className="border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {headline}
            </h2>
          </Reveal>

          <Reveal delay={200} y={10}>
            <div
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="group relative mt-10"
              style={{ perspective: '800px' }}
            >
              <div
                className="relative transform-gpu rounded-2xl border border-zinc-700/50 bg-white/[0.03] p-8 backdrop-blur-xl transition-transform duration-300 ease-out sm:p-10"
                style={{
                  transform: 'rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))',
                }}
              >
                <svg
                  className="absolute left-6 top-6 h-8 w-8 text-zinc-700"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H10v10H0z" />
                </svg>

                <p className="relative text-base leading-relaxed text-zinc-300 sm:text-lg sm:leading-relaxed">
                  {story}
                </p>

                <div className="mt-8 flex items-center gap-4 border-t border-zinc-700/20 pt-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 text-sm font-semibold text-zinc-300 shadow-lg shadow-black/20">
                    SS
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{name}</p>
                    <p className="text-xs text-zinc-500">{title}</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
