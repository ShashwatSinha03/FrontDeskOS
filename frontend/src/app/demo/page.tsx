import { ShimmerButton } from '@/components/ui/shimmer-button';

export default function DemoHomePage() {
  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white">Interactive Demo</h1>
          <p className="mt-4 text-zinc-400">
            Experience Nuvora in action. Explore a fully simulated business environment.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <ShimmerButton href="/demo/apex-dental">
              Enter Demo
            </ShimmerButton>
            <ShimmerButton href="/">
              Return Home
            </ShimmerButton>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-20 max-w-lg border-t border-zinc-800 pt-10 text-center">
        <h2 className="text-xl font-semibold text-white">Ready for the real thing?</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Set up Nuvora for your business and start capturing leads today.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <ShimmerButton href="https://calendly.com/sinhashashwat21/30min">
            Book a Discovery Call
          </ShimmerButton>
          <ShimmerButton href="mailto:sinhashashwat21@gmail.com">
            Talk to the Founder
          </ShimmerButton>
        </div>
      </div>
    </>
  );
}
