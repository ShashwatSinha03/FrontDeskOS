import { FounderContent } from '@/lib/marketing-content';

export function FounderSection({ headline, story }: FounderContent) {
  return (
    <section className="border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {headline}
          </h2>
          <div className="relative mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8 sm:p-10">
            <div className="absolute left-6 top-6 text-5xl font-serif leading-none text-zinc-700 select-none">
              &ldquo;
            </div>
            <p className="relative text-base leading-relaxed text-zinc-300 sm:text-lg sm:leading-relaxed">
              {story}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
