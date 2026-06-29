'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  priceMin: number;
  priceMax: number;
  durationMinutes: number;
}

function formatPrice(min: number, max: number) {
  if (min === max) return `$${min}`;
  return `$${min} \u2013 $${max}`;
}

export function ServicesOverview({ services, slug, businessName }: { services: ServiceItem[]; slug: string; businessName?: string }) {
  const displayed = services.slice(0, 6);

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-white">Our Services</h2>
          {businessName && (
            <p className="mt-3 text-base text-zinc-400">
              Services offered by {businessName}.
            </p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((service) => (
            <Card
              key={service.id}
              className="flex flex-col product-card p-6 transition-all duration-200"
            >
              <CardHeader className="pb-3 px-0 pt-0">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold text-white">{service.name}</CardTitle>
                </div>
                {service.description && (
                  <CardDescription className="line-clamp-2 text-sm text-zinc-400">
                    {service.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pb-4 px-0">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="secondary" className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-400 font-normal gap-1.5 hover:bg-blue-500/10">
                    <Clock className="h-3 w-3" />
                    {service.durationMinutes} min
                  </Badge>
                  <Badge variant="outline" className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-400 font-normal gap-1.5">
                    <DollarSign className="h-3 w-3" />
                    {formatPrice(service.priceMin, service.priceMax)}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="mt-auto pt-0 px-0">
                <Link href={`/${slug}/book?service=${service.id}`} className="w-full">
                  <Button size="sm" className="w-full bg-blue-600/80 text-white hover:bg-blue-500/80">
                    Book This Service
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
        {services.length > 6 && (
          <div className="mt-10 text-center">
            <Link
              href={`/${slug}/services`}
              className="inline-flex items-center text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              View All Services
              <span aria-hidden="true" className="ml-1">&rarr;</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
