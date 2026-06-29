'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/loader';

interface ReviewData {
  business: { name: string; slug: string; email: string; phone: string; address: string };
  services: { name: string; durationMinutes: number; price: number }[];
  hours: { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }[];
  faqs: { question: string; answer: string }[];
  ai: { greeting: string; escalationEmail: string; slotDurationMinutes: number };
}

interface ValidationIssue {
  section: string;
  field: string;
  message: string;
}

const DAY_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface StepReviewProps {
  data: ReviewData;
  onEdit: (step: number) => void;
  onPublish: () => void;
  publishing: boolean;
}

export function StepReview({ data, onEdit, onPublish, publishing }: StepReviewProps) {
  const [issues, setIssues] = useState<ValidationIssue[]>([]);

  useEffect(() => {
    const v: ValidationIssue[] = [];

    if (!data.business.name) v.push({ section: 'Business', field: 'name', message: 'Business name is required' });
    if (!data.business.slug) v.push({ section: 'Business', field: 'slug', message: 'URL slug is required' });
    if (!data.business.email) v.push({ section: 'Business', field: 'email', message: 'Email is required' });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.business.email)) {
      v.push({ section: 'Business', field: 'email', message: 'Invalid email format' });
    }

    if (!data.services || data.services.length === 0) {
      v.push({ section: 'Services', field: 'count', message: 'At least one service is required' });
    } else {
      data.services.forEach((s, i) => {
        if (!s.name) v.push({ section: 'Services', field: `name_${i}`, message: `Service ${i + 1} name is required` });
        if (!s.durationMinutes || s.durationMinutes < 5) v.push({ section: 'Services', field: `duration_${i}`, message: `Service ${i + 1} duration must be at least 5 min` });
      });
    }

    const openDays = data.hours.filter((h) => !h.isClosed);
    if (openDays.length === 0) v.push({ section: 'Hours', field: 'days', message: 'At least one open day is required' });

    if (!data.ai.greeting || data.ai.greeting.trim().length < 5) {
      v.push({ section: 'AI', field: 'greeting', message: 'AI greeting is required' });
    }
    if (!data.ai.escalationEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.ai.escalationEmail)) {
      v.push({ section: 'AI', field: 'escalationEmail', message: 'Valid escalation email is required' });
    }

    setIssues(v);
  }, [data]);

  const hoursSummary = (() => {
    const days = data.hours;
    const open = days.filter((d) => !d.isClosed);
    if (open.length === days.length) return 'Open every day';
    if (open.length === 0) return 'No days set';
    const closed = days.filter((d) => d.isClosed).map((d) => DAY_LABELS_SHORT[d.dayOfWeek]);
    return `Closed on ${closed.join(', ')}`;
  })();

  const totalPrice = data.services.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Review & Publish</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review everything before publishing. You can go back to edit any section.
        </p>
      </div>

      <div className="space-y-3">
        <SectionCard
          title="Business"
          step={1}
          onEdit={onEdit}
          issues={issues.filter((i) => i.section === 'Business')}
        >
          <p className="text-sm font-medium">{data.business.name || 'Not set'}</p>
          <p className="text-xs text-muted-foreground">/{data.business.slug || 'not-set'}</p>
          <p className="text-xs text-muted-foreground">{data.business.email}</p>
          {data.business.phone && <p className="text-xs text-muted-foreground">{data.business.phone}</p>}
        </SectionCard>

        <SectionCard
          title={`Services (${data.services.length})`}
          step={2}
          onEdit={onEdit}
          issues={issues.filter((i) => i.section === 'Services')}
        >
          {data.services.length === 0 ? (
            <p className="text-xs text-muted-foreground">No services added</p>
          ) : (
            <div className="space-y-1">
              {data.services.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.durationMinutes}min · ₹{s.price}
                  </span>
                </div>
              ))}
              <p className="mt-1 text-xs text-muted-foreground">
                {data.services.length} service{data.services.length !== 1 ? 's' : ''} · ₹{totalPrice.toLocaleString('en-IN')} total range
              </p>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Hours"
          step={3}
          onEdit={onEdit}
          issues={issues.filter((i) => i.section === 'Hours')}
        >
          <p className="text-sm">{hoursSummary}</p>
          <div className="mt-2 space-y-0.5">
            {data.hours.filter((h) => !h.isClosed).map((d) => (
              <p key={d.dayOfWeek} className="text-xs text-muted-foreground">
                {DAY_LABELS_SHORT[d.dayOfWeek]}: {d.openTime} – {d.closeTime}
              </p>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title={`FAQs (${data.faqs.length})`}
          step={4}
          onEdit={onEdit}
          issues={issues.filter((i) => i.section === 'FAQs')}
        >
          {data.faqs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No FAQs added</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {data.faqs.filter((f) => f.question && f.answer).length} filled · {data.faqs.length} total
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="AI Receptionist"
          step={5}
          onEdit={onEdit}
          issues={issues.filter((i) => i.section === 'AI')}
        >
          <p className="text-sm italic">&ldquo;{data.ai.greeting || 'Not set'}&rdquo;</p>
          <p className="text-xs text-muted-foreground">Escalations: {data.ai.escalationEmail || 'Not set'}</p>
          <p className="text-xs text-muted-foreground">Slots: {data.ai.slotDurationMinutes}min</p>
        </SectionCard>
      </div>

      {/* Validation summary */}
      {issues.length > 0 && (
        <Card className="product-card border-destructive/30">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-destructive">
              {issues.length} issue{issues.length !== 1 ? 's' : ''} to fix
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-4 pt-0">
            {issues.map((issue, i) => (
              <p key={i} className="text-xs text-destructive/80">
                {issue.section}: {issue.message}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {issues.length === 0 && (
        <Card className="product-card border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              All checks passed. Ready to publish.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => onEdit(5)}>Back</Button>
        <Button
          size="lg"
          disabled={issues.length > 0 || publishing}
          onClick={onPublish}
        >
          {publishing ? <Loader size={16} color="currentColor" /> : 'Publish Tenant'}
        </Button>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  step,
  onEdit,
  issues,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  issues: ValidationIssue[];
  children: React.ReactNode;
}) {
  const hasIssues = issues.length > 0;

  return (
    <Card className={"product-card "+cn(hasIssues && 'border-destructive/30')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">{children}</div>
          <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
            <button
              onClick={() => onEdit(step)}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline hover:text-foreground"
            >
              Edit
            </button>
            {hasIssues && (
              <span className="text-[10px] text-destructive">{issues.length} issue{issues.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
