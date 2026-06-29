'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { OwnerCreationForm } from '@/components/onboarding/owner-creation-form';
import { Loader } from '@/components/ui/loader';

const CHECKLIST_KEY = 'fdos_post_onboarding_checklist';

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 'website', label: 'Website loads', done: false },
  { id: 'booking', label: 'Book test appointment', done: false },
  { id: 'ai_chat', label: 'AI chat works', done: false },
  { id: 'owner', label: 'Owner invited', done: false },
  { id: 'followup', label: 'Follow-up scheduled', done: false },
];

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const businessId = searchParams.get('businessId');
  const tenantUrl = searchParams.get('tenantUrl') || '';
  const adminUrl = searchParams.get('adminUrl') || '';
  const bookingUrl = searchParams.get('bookingUrl') || '';
  const slug = searchParams.get('slug') || '';

  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [ownerDone, setOwnerDone] = useState(false);
  const [showOwnerForm, setShowOwnerForm] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHECKLIST_KEY);
      if (saved) setChecklist(JSON.parse(saved));
    } catch {}
  }, []);

  const toggleItem = (id: string) => {
    const next = checklist.map((item) =>
      item.id === id ? { ...item, done: !item.done } : item
    );
    setChecklist(next);
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
  };

  const handleOwnerComplete = ({ email, dashboardUrl }: { email: string; dashboardUrl: string; password?: string }) => {
    setOwnerDone(true);
    toggleItem('owner');
  };

  const handleOwnerSkip = () => {
    setShowOwnerForm(false);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Tenant Published</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your new tenant is live at /{slug}
        </p>
      </div>

      {/* URLs */}
      <div className="mb-8 space-y-3">
        <UrlCard label="Website URL" url={tenantUrl} />
        <UrlCard label="Admin URL" url={adminUrl} />
        <UrlCard label="Booking URL" url={bookingUrl} />
      </div>

      {/* Action buttons */}
      <div className="mb-8 flex flex-wrap gap-3">
        <a
          href={tenantUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Open Website
        </a>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-5 py-2 text-sm font-medium hover:bg-accent"
        >
          Open Booking
        </a>
        {!ownerDone && !showOwnerForm && (
          <Button variant="outline" onClick={() => setShowOwnerForm(true)}>
            Create Owner Account
          </Button>
        )}
      </div>

      {/* Owner creation */}
      {showOwnerForm && businessId && (
        <div className="mb-8">
          <OwnerCreationForm
            businessId={businessId}
            onComplete={handleOwnerComplete}
            onSkip={handleOwnerSkip}
          />
        </div>
      )}

      {ownerDone && !showOwnerForm && (
        <Card className="product-card mb-8 border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <svg className="h-5 w-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Owner invite sent. Share the admin URL with them.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Checklist */}
      <Card className="product-card">
        <CardContent className="p-4 sm:p-6">
          <h3 className="mb-3 text-sm font-medium">Post-Publish Checklist</h3>
          <div className="space-y-2">
            {checklist.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50"
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    item.done
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-muted-foreground/30'
                  }`}
                >
                  {item.done && (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
                <span className={item.done ? 'text-muted-foreground line-through' : ''}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center">
        <Button variant="outline" onClick={() => router.push('/ops/onboarding')}>
          Onboard Another Business
        </Button>
      </div>
    </div>
  );
}

function UrlCard({ label, url }: { label: string; url: string }) {
  return (
    <Card className="product-card">
      <CardContent className="flex items-center justify-between gap-4 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-sm font-medium">{url}</p>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(url)}
          className="shrink-0 rounded-md border px-3 py-1 text-xs hover:bg-accent"
        >
          Copy
        </button>
      </CardContent>
    </Card>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader size={24} color="#a3a3a3" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
