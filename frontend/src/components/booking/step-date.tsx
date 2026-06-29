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
        <h2 className="text-xl font-semibold text-white">Pick a Date</h2>
        <p className="text-sm text-zinc-400 mt-1">Select your preferred appointment date.</p>
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
              className={`flex flex-col items-center rounded-lg border p-2 text-xs transition-colors hover:border-blue-500 ${
                isSelected ? 'border-blue-500 bg-blue-500/10 font-medium text-white' : 'border-zinc-800 text-zinc-400'
              } ${isToday ? 'ring-1 ring-blue-500/30' : ''}`}
            >
              <span className="text-zinc-500">{DAY_NAMES[date.getDay()]}</span>
              <span className="text-base font-semibold text-white">{date.getDate()}</span>
              <span className="text-zinc-500">{MONTH_NAMES[date.getMonth()]}</span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">Back</Button>
        <Button onClick={onNext} disabled={!selected} className="bg-blue-600/80 text-white hover:bg-blue-500/80">Next</Button>
      </div>
    </div>
  );
}
