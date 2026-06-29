'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/loader';

interface StepPublishProps {
  status: 'publishing' | 'success' | 'error';
  error?: string;
  result?: {
    tenantUrl: string;
    adminUrl: string;
    bookingUrl: string;
    slug: string;
  } | null;
  onRetry: () => void;
  onSuccess: () => void;
}

export function StepPublish({ status, error, result, onRetry, onSuccess }: StepPublishProps) {
  if (status === 'publishing') {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="flex items-center justify-center py-8"><Loader size={32} color="#a3a3a3" /></div>
        <div className="space-y-2 text-center">
          <p className="text-lg font-medium">Creating your tenant...</p>
          <p className="text-sm text-muted-foreground">Setting up business, services, hours, and AI configuration.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div className="space-y-2 text-center">
          <p className="text-lg font-medium">Publishing failed</p>
          <p className="text-sm text-muted-foreground">{error || 'An unexpected error occurred. Please try again.'}</p>
        </div>
        <button
          onClick={onRetry}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (status === 'success' && result) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <div className="space-y-2 text-center">
          <p className="text-xl font-semibold">Tenant Published Successfully</p>
          <p className="text-sm text-muted-foreground">Your new tenant is live.</p>
        </div>

        <div className="w-full max-w-md space-y-3">
          <UrlField label="Website URL" url={result.tenantUrl} />
          <UrlField label="Admin URL" url={result.adminUrl} />
          <UrlField label="Booking URL" url={result.bookingUrl} />
        </div>

        <div className="flex gap-3">
          <a
            href={result.tenantUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Open Website
          </a>
          <a
            href={result.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-input bg-background px-6 py-2 text-sm font-medium hover:bg-accent"
          >
            Open Booking
          </a>
        </div>

        <button
          onClick={onSuccess}
          className="text-sm text-muted-foreground underline-offset-2 hover:underline hover:text-foreground"
        >
          Continue to Owner Setup →
        </button>
      </div>
    );
  }

  return null;
}

function UrlField({ label, url }: { label: string; url: string }) {
  const copy = () => {
    navigator.clipboard.writeText(url);
  };

  return (
    <Card className="product-card">
      <CardContent className="flex items-center justify-between gap-4 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-sm font-medium">{url}</p>
        </div>
        <button
          onClick={copy}
          className="shrink-0 rounded-md border px-3 py-1 text-xs hover:bg-accent"
        >
          Copy
        </button>
      </CardContent>
    </Card>
  );
}
