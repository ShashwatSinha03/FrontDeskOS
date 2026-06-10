import { ProblemContent } from '@/lib/marketing-content';
import { XCircle } from 'lucide-react';

export function ProblemSection({ headline, problems, result }: ProblemContent) {
  return (
    <section className="bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {headline}
          </h2>
        </div>

        <div className="mx-auto mt-16 max-w-xl space-y-4">
          {problems.map((problem, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4"
            >
              <XCircle className="h-5 w-5 shrink-0 text-red-400" />
              <span className="text-base text-zinc-300">{problem.text}</span>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-2xl font-semibold text-red-400">{result}</p>
      </div>
    </section>
  );
}
