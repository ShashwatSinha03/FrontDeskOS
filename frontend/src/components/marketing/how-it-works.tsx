import { HowItWorksContent } from '@/lib/marketing-content';

export function HowItWorks({ headline, steps }: HowItWorksContent) {
  return (
    <section className="border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {headline}
        </h2>

        <div className="relative mx-auto mt-16 max-w-3xl">
          <div className="absolute left-[23px] top-0 h-full w-px bg-zinc-800" />
          <div className="space-y-12">
            {steps.map((step) => (
              <div key={step.number} className="relative pl-14">
                <div className="absolute left-0 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-sm font-bold text-white">
                  {step.number}
                </div>
                <div className="pt-1">
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
