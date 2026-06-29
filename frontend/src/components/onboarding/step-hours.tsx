'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface DayHours {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface StepHoursProps {
  hours: DayHours[];
  onChange: (hours: DayHours[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepHours({ hours, onChange, onNext, onBack }: StepHoursProps) {
  const update = (dayOfWeek: number, field: keyof DayHours, value: string | boolean) => {
    const next = hours.map((h) =>
      h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h
    );
    onChange(next);
  };

  const toggleClosed = (dayOfWeek: number) => {
    const h = hours.find((h) => h.dayOfWeek === dayOfWeek);
    if (h) update(dayOfWeek, 'isClosed', !h.isClosed);
  };

  const applyToWeekdays = () => {
    const weekday = hours.find((h) => h.dayOfWeek === 1);
    if (!weekday) return;
    const next = hours.map((h) =>
      h.dayOfWeek >= 1 && h.dayOfWeek <= 5 ? { ...h, openTime: weekday.openTime, closeTime: weekday.closeTime } : h
    );
    onChange(next);
  };

  const openDays = hours.filter((h) => !h.isClosed);
  const isValid = openDays.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Business Hours</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set the weekly operating hours.
        </p>
      </div>

      <Card className="product-card">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {openDays.length} day{openDays.length !== 1 ? 's' : ''} open
            </span>
            <Button variant="ghost" size="sm" onClick={applyToWeekdays} className="text-xs">
              Copy Mon–Fri
            </Button>
          </div>

          <div className="space-y-2">
            {hours.map((day) => (
              <div
                key={day.dayOfWeek}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                  day.isClosed && 'bg-muted/30'
                )}
              >
                <div className="w-10 shrink-0 text-right text-sm font-medium sm:w-14 sm:text-left">
                  <span className="sm:hidden">{DAY_LABELS[day.dayOfWeek]}</span>
                  <span className="hidden sm:inline">{FULL_DAY_LABELS[day.dayOfWeek]}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleClosed(day.dayOfWeek)}
                    className={cn(
                      'rounded-md border px-2 py-1 text-xs transition-colors',
                      day.isClosed
                        ? 'border-destructive/30 bg-destructive/10 text-destructive'
                        : 'border-border text-muted-foreground hover:border-destructive/30 hover:text-destructive'
                    )}
                  >
                    {day.isClosed ? 'Closed' : 'Open'}
                  </button>
                </div>

                {!day.isClosed && (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={day.openTime}
                      onChange={(e) => update(day.dayOfWeek, 'openTime', e.target.value)}
                      className="h-8 w-24 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="time"
                      value={day.closeTime}
                      onChange={(e) => update(day.dayOfWeek, 'closeTime', e.target.value)}
                      className="h-8 w-24 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {!isValid && (
        <p className="text-sm text-destructive">At least one day must be open.</p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button disabled={!isValid} onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
}
