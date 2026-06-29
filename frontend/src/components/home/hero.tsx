'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function HeroSection({ businessName, slug, description }: { businessName: string; slug: string; description?: string | null }) {
  return (
    <section className="relative overflow-hidden bg-black border-b border-zinc-800">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/50 via-black to-black" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {businessName}
          </h1>
          {description && (
            <p className="mt-4 sm:mt-6 text-base sm:text-lg leading-relaxed text-zinc-400 max-w-lg">
              {description}
            </p>
          )}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3">
            <Link href={`/${slug}/book`}>
              <Button size="lg" className="w-full sm:w-auto bg-blue-600/80 text-white hover:bg-blue-500/80">
                Book an Appointment
              </Button>
            </Link>
            <Link href={`/${slug}/services`}>
              <Button variant="outline" size="lg" className="w-full sm:w-auto border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                View Services
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

