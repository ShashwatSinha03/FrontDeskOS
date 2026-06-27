export function CTAFooter() {
  return (
    <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-12 text-center">
      <h2 className="text-xl font-semibold text-white">Ready for the real thing?</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Set up Novura for your business and start capturing leads today.
      </p>
      <div className="mt-6 flex items-center justify-center gap-4">
        <a
          href="https://calendly.com/sinhashashwat21/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500"
        >
          Book a Discovery Call
        </a>
        <a
          href="mailto:sinhashashwat21@gmail.com"
          className="rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
        >
          Talk to the Founder
        </a>
      </div>
    </div>
  );
}
