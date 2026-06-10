'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function HeroSection({ businessName, slug, description }: { businessName: string; slug: string; description?: string | null }) {
  return (
    <section className="relative overflow-hidden bg-background border-b">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/50 via-background to-background" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {businessName}
          </h1>
          {description && (
            <p className="mt-4 sm:mt-6 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-lg">
              {description}
            </p>
          )}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3">
            <Link href={`/${slug}/book`}>
              <Button size="lg" className="w-full sm:w-auto">
                Book an Appointment
              </Button>
            </Link>
            <Link href={`/${slug}/services`}>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                View Services
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

