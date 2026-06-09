import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
      <div className="mx-auto max-w-2xl px-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          FrontDeskOS
        </h1>
        <p className="mt-6 text-lg text-slate-300">
          AI-powered front desk management for dental clinics and healthcare providers.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/apex-dental">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
              View Demo Clinic
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
