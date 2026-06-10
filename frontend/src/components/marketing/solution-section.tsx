import { SolutionContent } from '@/lib/marketing-content';
import { Radio } from 'lucide-react';

export function SolutionSection({ headline, items }: SolutionContent) {
  return (
    <section className="border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {headline}
          </h2>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-px overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-800 sm:grid-cols-2">
          {items.map((item, i) => (
            <div
              key={i}
              className="bg-zinc-900/90 p-6 transition hover:bg-zinc-900"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/50">
                <Radio className="h-4 w-4 text-blue-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white">{item.label}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
