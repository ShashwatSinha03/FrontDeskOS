import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-7xl font-bold text-muted-foreground">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">Page not found</p>
      <p className="mt-2 text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
      <div className="mt-8 flex items-center gap-3">
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
        <a href="/" className="rounded-lg border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
          Go Back
        </a>
      </div>
    </div>
  );
}
