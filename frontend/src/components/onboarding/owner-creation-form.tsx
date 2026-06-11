'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { createOwnerInvite } from '@/lib/onboarding';

interface OwnerCreationFormProps {
  businessId: string;
  onComplete: (result: { email: string; dashboardUrl: string; password?: string }) => void;
  onSkip: () => void;
}

export function OwnerCreationForm({ businessId, onComplete, onSkip }: OwnerCreationFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string; dashboardUrl: string } | null>(null);

  const isValid = name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    setError(null);

    try {
      const result = await createOwnerInvite(businessId, name.trim(), email.trim());
      if (result.password) {
        setCreated({ email: result.email, password: result.password, dashboardUrl: result.dashboardUrl });
      }
      onComplete({ email: result.email, dashboardUrl: result.dashboardUrl, password: result.password });
    } catch (err: any) {
      setError(err.message || 'Failed to create owner');
    } finally {
      setSaving(false);
    }
  };

  const copyPassword = () => {
    if (created) navigator.clipboard.writeText(created.password);
  };

  if (created) {
    return (
      <Card className="border-emerald-500/20">
        <CardHeader>
          <CardTitle className="text-lg text-emerald-600 dark:text-emerald-400">Owner Created</CardTitle>
          <CardDescription>
            Share these credentials with the owner. They can change their password after logging in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Sign-in URL</p>
              <p className="text-sm font-medium">{created.dashboardUrl}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Email</p>
              <p className="text-sm font-medium">{created.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Temporary Password</p>
              <div className="flex items-center gap-2">
                <code className="rounded border bg-background px-2 py-0.5 text-sm font-mono">{created.password}</code>
                <button
                  onClick={copyPassword}
                  className="shrink-0 rounded-md border px-2 py-1 text-xs hover:bg-accent"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            This password will not be shown again. Save it before continuing.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => onComplete({ email: created.email, dashboardUrl: created.dashboardUrl, password: created.password })} className="w-full">
            Done — I&apos;ve saved the credentials
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg">Create Owner Account</CardTitle>
        <CardDescription>
          Create a login account for the business owner so they can access the admin dashboard.
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
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button variant="outline" type="button" onClick={onSkip} className="flex-1">
            Skip for now
          </Button>
          <Button type="submit" disabled={!isValid || saving} className="flex-1">
            {saving ? 'Creating account...' : 'Create Account'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
