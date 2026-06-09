'use client';

import { Button } from '@/components/ui/button';
import { useAvailability } from '@/hooks/use-availability';

export function StepTime({
  businessId,
  serviceId,
  date,
  selected,
  onSelect,
  onBack,
  onNext,
}: {
  businessId: string;
  serviceId: string | null;
  date: string;
  selected: string | null;
  onSelect: (time: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const { slots, isLoading, error } = useAvailability(businessId, date, serviceId || undefined);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Pick a Time</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Available slots for {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading available times...</p>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Unable to load available times.</p>
        </div>
      )}

      {!isLoading && !error && slots.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No available slots for this date. Please select another date.</p>
        </div>
      )}

      {!isLoading && !error && slots.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {slots.map((slot) => {
            const timeLabel = new Date(slot.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            const isSelected = selected === slot.time;
            return (
              <button
                key={slot.time}
                onClick={() => onSelect(slot.time)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors hover:border-primary ${
                  isSelected ? 'border-primary bg-primary/5 font-medium' : 'border-border'
                }`}
              >
                {timeLabel}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext} disabled={!selected}>Next</Button>
      </div>
    </div>
  );
}
