import Link from 'next/link';

export default function DemoHomePage() {
  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white">Interactive Demo</h1>
          <p className="mt-4 text-zinc-400">
            Experience Novura in action. Explore a fully simulated business environment.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/demo/apex-dental"
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Enter Demo
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-20 max-w-lg border-t border-zinc-800 pt-10 text-center">
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
    </>
  );
}
