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

export function ServiceCard({ service, slug }: { service: ServiceItem; slug: string }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{service.name}</CardTitle>
        {service.description && (
          <CardDescription>{service.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {service.durationMinutes} min
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            ${service.priceMin} &ndash; ${service.priceMax}
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/${slug}/book?service=${service.id}`} className="w-full">
          <Button className="w-full" size="sm">
            Book This Service
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
