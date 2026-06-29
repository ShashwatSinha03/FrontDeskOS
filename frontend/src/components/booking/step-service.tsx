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
        <h2 className="text-xl font-semibold text-white">Select a Service</h2>
        <p className="text-sm text-zinc-400 mt-1">Choose the service you'd like to book.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {services.map((service) => (
          <Card
            key={service.id}
            className={"product-card "+`cursor-pointer rounded-xl border-2 p-4 transition-colors hover:border-blue-500/50 ${
              selected === service.id
                ? 'border-blue-500 bg-blue-500/10 rounded-xl'
                : 'border-zinc-800/60 bg-zinc-900/30'
            }`}
            onClick={() => onSelect(service.id)}
          >
            <h3 className="font-medium text-white">{service.name}</h3>
            {service.description && (
              <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{service.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-zinc-400">
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
        <Button onClick={onNext} disabled={!selected} className="bg-blue-600/80 text-white hover:bg-blue-500/80">
          Next
        </Button>
      </div>
    </div>
  );
}
