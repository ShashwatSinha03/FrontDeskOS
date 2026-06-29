'use client';

import { Button } from '@/components/ui/button';

function getDates(days: number): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function StepDate({
  selected,
  onSelect,
  onBack,
  onNext,
}: {
  selected: string | null;
  onSelect: (date: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const dates = getDates(30);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Pick a Date</h2>
        <p className="text-sm text-muted-foreground mt-1">Select your preferred appointment date.</p>
      </div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-7 md:grid-cols-10">
        {dates.map((date) => {
          const dateStr = date.toISOString().split('T')[0];
          const isSelected = selected === dateStr;
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <button
              key={dateStr}
              onClick={() => onSelect(dateStr)}
              className={`flex flex-col items-center rounded-lg border p-2 text-xs transition-colors hover:border-primary ${
                isSelected ? 'border-primary bg-primary/5 font-medium' : 'border-border'
              } ${isToday ? 'ring-1 ring-primary/30' : ''}`}
            >
              <span className="text-muted-foreground">{DAY_NAMES[date.getDay()]}</span>
              <span className="text-base font-semibold">{date.getDate()}</span>
              <span className="text-muted-foreground">{MONTH_NAMES[date.getMonth()]}</span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext} disabled={!selected}>Next</Button>
      </div>
    </div>
  );
}
