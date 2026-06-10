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
    <Card className="flex flex-col transition-all duration-200 hover:shadow-sm hover:border-muted-foreground/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{service.name}</CardTitle>
        {service.description && (
          <CardDescription className="text-sm leading-relaxed">{service.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-normal gap-1.5 px-2.5 py-1">
            <Clock className="h-3 w-3" />
            {service.durationMinutes} min
          </Badge>
          <Badge variant="outline" className="font-normal gap-1.5 px-2.5 py-1">
            <DollarSign className="h-3 w-3" />
            {formatPrice(service.priceMin, service.priceMax)}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Link href={`/${slug}/book?service=${service.id}`} className="w-full">
          <Button className="w-full" size="sm">
            Book This Service
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
