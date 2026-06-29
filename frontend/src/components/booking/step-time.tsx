'use client';

import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
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
        <h2 className="text-xl font-semibold text-white">Pick a Time</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Available slots for {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader size={24} color="#a3a3a3" />
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-12">
          <p className="text-zinc-400">Unable to load available times.</p>
        </div>
      )}

      {!isLoading && !error && slots.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <p className="text-zinc-400">No available slots for this date. Please select another date.</p>
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
                className={`rounded-lg border px-3 py-2 text-sm transition-colors hover:border-blue-500 ${
                  isSelected ? 'border-blue-500 bg-blue-500/10 font-medium text-white' : 'border-zinc-800 text-zinc-400'
                }`}
              >
                {timeLabel}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">Back</Button>
        <Button onClick={onNext} disabled={!selected} className="bg-blue-600/80 text-white hover:bg-blue-500/80">Next</Button>
      </div>
    </div>
  );
}
