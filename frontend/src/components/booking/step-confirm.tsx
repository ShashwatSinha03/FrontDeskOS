'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { bookAppointment } from '@/lib/api';
import { ensureSession } from '@/lib/session';
import { TurnstileWidget } from '@/components/ui/turnstile-widget';
import { LegalConsent } from '@/components/legal/legal-consent';
import { Loader } from '@/components/ui/loader';
import { CheckCircle, Calendar, Clock, User } from 'lucide-react';

interface ServiceItem {
  id: string;
  name: string;
  durationMinutes: number;
}

export function StepConfirm({
  businessId,
  businessSlug,
  service,
  date,
  time,
  customerName,
  customerEmail,
  customerPhone,
  onBack,
  onDone,
}: {
  businessId: string;
  businessSlug: string;
  service: ServiceItem | null;
  date: string;
  time: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [booking, setBooking] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [consent, setConsent] = useState(false);

  const handleConfirm = async () => {
    setBooking('loading');
    setErrorMsg('');

    try {
      const sessionId = await ensureSession(businessId);

      // Construct ISO datetime from date and time (time may be ISO from slots or HH:mm)
      const appointmentTime = time && time.includes('T')
        ? time
        : `${date}T${time || '00:00'}:00.000Z`;

      const res = await bookAppointment({
        businessId,
        sessionId,
        serviceId: service?.id || null,
        appointmentTime,
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        turnstileToken: turnstileToken || undefined,
      });

      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);

      if (res.success) {
        setBooking('success');
        sessionStorage.setItem('booking-success', JSON.stringify({
          businessId,
          businessSlug,
          serviceName: service?.name || null,
          serviceDuration: service?.durationMinutes || null,
          date,
          time,
          customerName,
          customerEmail,
          customerPhone,
        }));
        setTimeout(() => router.push(`/${businessSlug}/book/success`), 1500);
      } else {
        setBooking('error');
        setErrorMsg(res.error || 'Failed to book appointment.');
      }
    } catch (err: any) {
      setBooking('error');
      setErrorMsg(err.message || 'An unexpected error occurred.');
    }
  };

  if (booking === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <h2 className="text-2xl font-semibold text-white">Appointment Confirmed!</h2>
        <p className="text-zinc-400 text-center max-w-md">
          Your appointment has been booked successfully. We&apos;ll send a confirmation to {customerEmail}.
        </p>
        <p className="text-sm text-zinc-500">Redirecting to confirmation page...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Confirm Your Appointment</h2>
        <p className="text-sm text-zinc-400 mt-1">Please review your details before confirming.</p>
      </div>

      <Card className="product-card border border-zinc-800/60 bg-zinc-900/30">
        <CardContent className="space-y-4 pt-6">
          {service && (
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-zinc-400" />
              <div>
                <p className="font-medium text-white">{service.name}</p>
                <p className="text-sm text-zinc-400">{service.durationMinutes} minutes</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-zinc-400" />
            <div>
              <p className="font-medium text-white">
                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-zinc-400" />
            <div>
              <p className="font-medium text-white">
                {new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-zinc-400" />
            <div>
              <p className="font-medium text-white">{customerName}</p>
              <p className="text-sm text-zinc-400">{customerEmail} · {customerPhone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {booking === 'error' && (
        <p className="text-sm text-red-500">{errorMsg}</p>
      )}

      <TurnstileWidget
        key={turnstileKey}
        onVerify={(token) => setTurnstileToken(token)}
        onExpire={() => setTurnstileToken(null)}
        onError={() => setTurnstileToken(null)}
      />

      <LegalConsent checked={consent} onChange={setConsent} id="booking-consent" />

      {!consent && booking !== 'loading' && (
        <p className="text-xs text-zinc-400">You must agree to the terms to continue.</p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={booking === 'loading'} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">Back</Button>
        <Button onClick={handleConfirm} disabled={booking === 'loading' || !consent} className="bg-blue-600/80 text-white hover:bg-blue-500/80">
          {booking === 'loading' ? <Loader size={16} color="currentColor" /> : 'Confirm Booking'}
        </Button>
      </div>
    </div>
  );
}
