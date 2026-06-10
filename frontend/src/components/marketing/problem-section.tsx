import { ProblemContent } from '@/lib/marketing-content';
import { XCircle, ArrowDown } from 'lucide-react';

export function ProblemSection({ headline, problems, result }: ProblemContent) {
  return (
    <section className="border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {headline}
          </h2>
        </div>

        <div className="mx-auto mt-16 max-w-lg space-y-3">
          {problems.map((problem, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4 transition hover:border-zinc-700"
            >
              <XCircle className="h-5 w-5 shrink-0 text-red-400" />
              <span className="text-base text-zinc-300">{problem.text}</span>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 flex max-w-lg items-center justify-center gap-4 text-zinc-600">
          <div className="h-px flex-1 bg-zinc-800" />
          <ArrowDown className="h-5 w-5 shrink-0" />
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <p className="mx-auto mt-8 max-w-lg text-center text-2xl font-semibold tracking-tight text-red-400">
          {result}
        </p>
      </div>
    </section>
  );
}
