'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { bookAppointment } from '@/lib/api';
import { ensureSession } from '@/lib/session';
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
      });

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
        <h2 className="text-2xl font-semibold">Appointment Confirmed!</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Your appointment has been booked successfully. We&apos;ll send a confirmation to {customerEmail}.
        </p>
        <p className="text-sm text-muted-foreground">Redirecting to confirmation page...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Confirm Your Appointment</h2>
        <p className="text-sm text-muted-foreground mt-1">Please review your details before confirming.</p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {service && (
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{service.name}</p>
                <p className="text-sm text-muted-foreground">{service.durationMinutes} minutes</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{customerName}</p>
              <p className="text-sm text-muted-foreground">{customerEmail} · {customerPhone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {booking === 'error' && (
        <p className="text-sm text-red-500">{errorMsg}</p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={booking === 'loading'}>Back</Button>
        <Button onClick={handleConfirm} disabled={booking === 'loading'}>
          {booking === 'loading' ? 'Booking...' : 'Confirm Booking'}
        </Button>
      </div>
    </div>
  );
}
