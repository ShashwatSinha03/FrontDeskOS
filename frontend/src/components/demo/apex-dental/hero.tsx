import Link from 'next/link';

export function ApexHero() {
  return (
    <section className="relative min-h-[70vh] overflow-hidden bg-gradient-to-b from-zinc-900 to-black px-4 pt-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl py-20 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400">
            Premium Dental Care in San Francisco
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Your Smile Is Our <span className="text-blue-500">Priority</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            Apex Dental Care combines cutting-edge technology with compassionate care.
            From routine checkups to cosmetic dentistry, we&apos;re here for the whole family.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/demo/dashboard"
              className="rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Owner Dashboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
