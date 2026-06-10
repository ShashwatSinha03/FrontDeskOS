import { FounderContent } from '@/lib/marketing-content';
import { Quote } from 'lucide-react';

export function FounderSection({ headline, name, title, story }: FounderContent) {
  return (
    <section className="border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {headline}
          </h2>
          <div className="relative mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8 sm:p-10">
            <Quote className="absolute left-6 top-6 h-8 w-8 text-zinc-700" />
            <p className="relative text-base leading-relaxed text-zinc-300 sm:text-lg sm:leading-relaxed">
              {story}
            </p>
            <div className="mt-6 flex items-center gap-4 border-t border-zinc-800 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-400">
                SS
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{name}</p>
                <p className="text-xs text-zinc-500">{title}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
