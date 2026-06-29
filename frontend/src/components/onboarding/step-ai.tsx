'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface AiConfig {
  greeting: string;
  escalationEmail: string;
  slotDurationMinutes: number;
}

interface StepAiProps {
  data: AiConfig;
  onChange: (data: AiConfig) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepAi({ data, onChange, onNext, onBack }: StepAiProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleBlur = () => {
    const e: Record<string, string> = {};
    if (!data.greeting || data.greeting.trim().length < 5) {
      e.greeting = 'Greeting must be at least 5 characters';
    }
    if (!data.escalationEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.escalationEmail)) {
      e.escalationEmail = 'A valid escalation email is required';
    }
    setErrors(e);
  };

  const isValid = data.greeting.trim().length >= 5
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.escalationEmail);

  const slotOptions = [15, 30, 45, 60];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">AI Receptionist</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure how the AI greets and interacts with customers.
        </p>
      </div>

      <Card className="product-card">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Greeting Message</label>
            <textarea
              className="flex h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              placeholder="Welcome! How can I help you today?"
              value={data.greeting}
              onChange={(e) => onChange({ ...data, greeting: e.target.value })}
              onBlur={handleBlur}
            />
            {errors.greeting && <p className="text-xs text-destructive">{errors.greeting}</p>}
            <p className="text-xs text-muted-foreground">
              This is the first message customers see when they open the chat.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Escalation Email</label>
            <Input
              type="email"
              placeholder="owner@business.com"
              value={data.escalationEmail}
              onChange={(e) => onChange({ ...data, escalationEmail: e.target.value })}
              onBlur={handleBlur}
            />
            {errors.escalationEmail && <p className="text-xs text-destructive">{errors.escalationEmail}</p>}
            <p className="text-xs text-muted-foreground">
              Conversations the AI cannot handle will be escalated to this email.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Appointment Slot Duration</label>
            <div className="flex gap-2">
              {slotOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => onChange({ ...data, slotDurationMinutes: opt })}
                  className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                    data.slotDurationMinutes === opt
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-input text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {opt} min
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 product-card border-primary/20 p-4">
            <p className="text-xs font-medium text-muted-foreground">Preview</p>
            <p className="mt-1 text-sm italic text-foreground">
              &ldquo;{data.greeting || 'Welcome! How can I help you today?'}&rdquo;
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button disabled={!isValid} onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
}
