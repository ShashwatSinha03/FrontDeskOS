'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign } from 'lucide-react';

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  priceMin: number;
  priceMax: number;
  durationMinutes: number;
}

export function ServicesOverview({ services, slug }: { services: ServiceItem[]; slug: string }) {
  const displayed = services.slice(0, 4);

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Our Services</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Comprehensive dental care tailored to your needs
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((service) => (
            <Card key={service.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{service.name}</CardTitle>
                {service.description && (
                  <CardDescription className="line-clamp-2">{service.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="mt-auto flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {service.durationMinutes} min
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  ${service.priceMin} &ndash; ${service.priceMax}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
        {services.length > 4 && (
          <div className="mt-10 text-center">
            <Link
              href={`/${slug}/services`}
              className="text-sm font-medium text-primary hover:underline"
            >
              View All Services &rarr;
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
