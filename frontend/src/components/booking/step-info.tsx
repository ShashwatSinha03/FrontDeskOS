'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function StepInfo({
  name,
  email,
  phone,
  onChange,
  onBack,
  onNext,
}: {
  name: string;
  email: string;
  phone: string;
  onChange: (field: 'name' | 'email' | 'phone', value: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const isValid = name.trim().length > 0 && email.trim().length > 0 && phone.trim().length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Your Information</h2>
        <p className="text-sm text-muted-foreground mt-1">We'll use this to confirm your appointment.</p>
      </div>
      <div className="space-y-4 max-w-sm">
        <div>
          <label className="text-sm font-medium block mb-1">Full Name</label>
          <Input
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => onChange('name', e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Email</label>
          <Input
            type="email"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => onChange('email', e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Phone</label>
          <Input
            type="tel"
            placeholder="(555) 123-4567"
            value={phone}
            onChange={(e) => onChange('phone', e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext} disabled={!isValid}>Next</Button>
      </div>
    </div>
  );
}
