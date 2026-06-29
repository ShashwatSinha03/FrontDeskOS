'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign } from 'lucide-react';

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

export function ServiceCard({ service, slug }: { service: ServiceItem; slug: string }) {
  return (
    <Card className="flex flex-col product-card p-6 transition-all duration-200">
      <CardHeader className="pb-3 px-0 pt-0">
        <CardTitle className="text-base font-semibold text-white">{service.name}</CardTitle>
        {service.description && (
          <CardDescription className="text-sm leading-relaxed text-zinc-400">{service.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 pb-4 px-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-400 font-normal gap-1.5">
            <Clock className="h-3 w-3" />
            {service.durationMinutes} min
          </Badge>
          <Badge variant="outline" className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-400 font-normal gap-1.5">
            <DollarSign className="h-3 w-3" />
            {formatPrice(service.priceMin, service.priceMax)}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="pt-0 px-0">
        <Link href={`/${slug}/book?service=${service.id}`} className="w-full">
          <Button className="w-full bg-blue-600/80 text-white hover:bg-blue-500/80" size="sm">
            Book This Service
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
