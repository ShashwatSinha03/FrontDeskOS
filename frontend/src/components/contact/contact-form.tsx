'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LegalConsent } from '@/components/legal/legal-consent';
import { ensureSession } from '@/lib/session';
import { TurnstileWidget } from '@/components/ui/turnstile-widget';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export function ContactForm({ slug, businessId }: { slug: string; businessId: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [consent, setConsent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const message = (form.elements.namedItem('message') as HTMLTextAreaElement).value;

    try {
      const sessionId = await ensureSession(businessId);
      const res = await fetch(`${API_URL}/public/businesses/${slug}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, sessionId, turnstileToken: turnstileToken || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        setSubmitted(true);
      } else {
        setError(json.error || 'Failed to send message');
      }
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);
    } catch {
      setError('Network error. Please try again.');
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Message Sent!</CardTitle>
          <CardDescription>
            Thank you for reaching out. We'll get back to you as soon as possible.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Us a Message</CardTitle>
        <CardDescription>
          Have a question? Fill out the form below and we'll get back to you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Your Name</label>
            <Input name="name" placeholder="Jane Doe" required />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Email</label>
            <Input name="email" type="email" placeholder="jane@example.com" required />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Message</label>
            <textarea
              name="message"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="How can we help you?"
              required
            />
          </div>
          <TurnstileWidget
            key={turnstileKey}
            onVerify={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
          />
          <LegalConsent checked={consent} onChange={setConsent} id="contact-consent" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={sending || !consent}>
            {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
