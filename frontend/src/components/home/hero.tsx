'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function HeroSection({ businessName, slug }: { businessName: string; slug: string }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          {businessName}
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-300 max-w-2xl mx-auto">
          Your trusted dental care provider. We combine expertise with compassion
          to give you and your family the healthy smiles you deserve.
        </p>
        <div className="mt-10">
          <Link href={`/${slug}/book`}>
            <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
              Book an Appointment
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
