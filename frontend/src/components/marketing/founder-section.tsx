import { FounderContent } from '@/lib/marketing-content';

export function FounderSection({ headline, story }: FounderContent) {
  return (
    <section className="border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {headline}
          </h2>
          <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8">
            <p className="text-base leading-relaxed text-zinc-400 sm:text-lg">
              &ldquo;{story}&rdquo;
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
