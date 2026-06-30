import { ShimmerButton } from '@/components/ui/shimmer-button';

export function CTAFooter() {
  return (
    <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-12 text-center">
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
  );
}
