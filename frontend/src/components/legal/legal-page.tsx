import Link from 'next/link';
import { getLegalConfig } from '@/lib/legal-config';

interface LegalPageProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function LegalPage({ title, description, children }: LegalPageProps) {
  const config = getLegalConfig();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            &larr; Back to Nuvora
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mb-8">{description}</p>
        )}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {children}
        </div>
      </main>
      <footer className="border-t">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} {config.companyName}. All rights reserved.</span>
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="underline hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/acceptable-use" className="underline hover:text-foreground transition-colors">Acceptable Use</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
