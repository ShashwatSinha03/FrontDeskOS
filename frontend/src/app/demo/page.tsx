import Link from 'next/link';

export default function DemoHomePage() {
  return (
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
  );
}
