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
        <h2 className="text-xl font-semibold text-white">Your Information</h2>
        <p className="text-sm text-zinc-400 mt-1">We'll use this to confirm your appointment.</p>
      </div>
      <div className="space-y-4 max-w-sm">
        <div>
          <label className="text-sm font-medium text-white block mb-1">Full Name</label>
          <Input
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => onChange('name', e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-white block mb-1">Email</label>
          <Input
            type="email"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => onChange('email', e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-white block mb-1">Phone</label>
          <Input
            type="tel"
            placeholder="(555) 123-4567"
            value={phone}
            onChange={(e) => onChange('phone', e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500"
          />
        </div>
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">Back</Button>
        <Button onClick={onNext} disabled={!isValid} className="bg-blue-600/80 text-white hover:bg-blue-500/80">Next</Button>
      </div>
    </div>
  );
}
