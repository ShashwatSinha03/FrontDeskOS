'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fetchIndustryList, fetchIndustryTemplate, IndustryTemplate } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

const industryIcons: Record<string, string> = {
  gym: '🏋️',
  salon: '💇',
  spa: '🧖',
  dental: '🦷',
  professional_services: '💼',
};

interface StepIndustryProps {
  onSelect: (industry: string, template: IndustryTemplate) => void;
}

export function StepIndustry({ onSelect }: StepIndustryProps) {
  const [industries, setIndustries] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIndustryList()
      .then(setIndustries)
      .catch(() => setIndustries([
        { id: 'gym', label: 'Gym & Fitness' },
        { id: 'salon', label: 'Salon & Beauty' },
        { id: 'spa', label: 'Spa & Wellness' },
        { id: 'dental', label: 'Dental Clinic' },
        { id: 'professional_services', label: 'Professional Services' },
      ]))
      .finally(() => setLoading(false));
  }, []);

  const handleContinue = async () => {
    if (!selected) return;
    setLoadingTemplate(true);
    setError(null);
    try {
      const template = await fetchIndustryTemplate(selected);
      onSelect(selected, template);
    } catch (err: any) {
      setError(err.message || 'Failed to load template. Check that the backend is running.');
      setLoadingTemplate(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">What type of business?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose an industry to get started with pre-configured templates.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 w-8 rounded bg-muted" />
                <div className="mt-3 h-4 w-24 rounded bg-muted" />
                <div className="mt-1 h-3 w-32 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((ind) => (
            <button
              key={ind.id}
              onClick={() => setSelected(ind.id)}
              className={cn(
                'group rounded-xl border p-6 text-left transition-all hover:border-primary/50',
                selected === ind.id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border bg-card'
              )}
            >
              <span className="text-2xl">{industryIcons[ind.id] || '📋'}</span>
              <h3 className="mt-3 font-medium">{ind.label}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {ind.id === 'gym' && 'Memberships, classes, personal training'}
                {ind.id === 'salon' && 'Hair, nails, skincare, makeup'}
                {ind.id === 'spa' && 'Massages, facials, body treatments'}
                {ind.id === 'dental' && 'Checkups, cleanings, procedures'}
                {ind.id === 'professional_services' && 'Consultations, sessions, bookings'}
              </p>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          size="lg"
          disabled={!selected || loadingTemplate}
          onClick={handleContinue}
        >
          {loadingTemplate ? 'Loading...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
