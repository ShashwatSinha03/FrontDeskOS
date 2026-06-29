'use client';

interface TourProgressProps {
  current: number;
  total: number;
}

export function TourProgress({ current, total }: TourProgressProps) {
  const dots: ('filled' | 'current' | 'empty')[] = [];
  for (let i = 0; i < total; i++) {
    if (i < current - 1) dots.push('filled');
    else if (i === current - 1) dots.push('current');
    else dots.push('empty');
  }

  return (
    <div className="flex items-center gap-2" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total}>
      <span className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
        Customer Journey
      </span>
      <div className="flex items-center gap-1">
        {dots.map((dot, i) => (
          <span
            key={i}
            className={`block h-1.5 rounded-full transition-all duration-300 ${
              dot === 'filled'
                ? 'w-3 bg-blue-500/60'
                : dot === 'current'
                ? 'w-3 bg-blue-400'
                : 'w-1.5 bg-zinc-700'
            }`}
          />
        ))}
      </div>
      <span className="text-[10px] font-medium text-zinc-500">
        {current} / {total}
      </span>
    </div>
  );
}
