'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { createOwnerInvite } from '@/lib/onboarding';

interface OwnerCreationFormProps {
  businessId: string;
  onComplete: (result: { email: string; dashboardUrl: string }) => void;
  onSkip: () => void;
}

export function OwnerCreationForm({ businessId, onComplete, onSkip }: OwnerCreationFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    setError(null);

    try {
      const result = await createOwnerInvite(businessId, name.trim(), email.trim());
      onComplete({ email: result.email, dashboardUrl: result.dashboardUrl });
    } catch (err: any) {
      setError(err.message || 'Failed to create owner');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg">Create Owner Account</CardTitle>
        <CardDescription>
          Send an invite to the business owner so they can access the admin dashboard.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Owner Name</label>
            <Input
              placeholder="Rajesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Owner Email</label>
            <Input
              type="email"
              placeholder="rajesh@business.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              An invite email will be sent to this address.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button variant="outline" type="button" onClick={onSkip} className="flex-1">
            Skip for now
          </Button>
          <Button type="submit" disabled={!isValid || saving} className="flex-1">
            {saving ? 'Sending invite...' : 'Send Invite'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
