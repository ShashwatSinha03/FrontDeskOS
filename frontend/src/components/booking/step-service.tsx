'use client';

import { Card } from '@/components/ui/card';
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

export function StepService({
  services,
  selected,
  onSelect,
  onNext,
}: {
  services: ServiceItem[];
  selected: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Select a Service</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose the service you'd like to book.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {services.map((service) => (
          <Card
            key={service.id}
            className={`cursor-pointer border-2 p-4 transition-colors hover:border-primary ${
              selected === service.id ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            onClick={() => onSelect(service.id)}
          >
            <h3 className="font-medium">{service.name}</h3>
            {service.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {service.durationMinutes} min
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                ${service.priceMin} – ${service.priceMax}
              </span>
            </div>
          </Card>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!selected}>
          Next
        </Button>
      </div>
    </div>
  );
}
