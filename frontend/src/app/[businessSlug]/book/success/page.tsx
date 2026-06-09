'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Calendar, Clock, User } from 'lucide-react';

interface BookingData {
  businessId: string;
  businessSlug: string;
  serviceName: string | null;
  serviceDuration: number | null;
  date: string;
  time: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export default function BookingSuccessPage() {
  const params = useParams();
  const slug = params.businessSlug as string;
  const [data, setData] = useState<BookingData | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('booking-success');
    if (raw) {
      try {
        setData(JSON.parse(raw));
        sessionStorage.removeItem('booking-success');
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  if (!data) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <h1 className="text-2xl font-bold">Appointment Confirmed</h1>
        <p className="text-muted-foreground">Your appointment was booked successfully.</p>
        <Link href={`/${slug}`}>
          <Button>Back to Home</Button>
        </Link>
      </div>
    );
  }

  const dateObj = new Date(data.date + 'T00:00:00');
  const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = new Date(data.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const googleCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(data.serviceName || 'Appointment')}&dates=${data.date.replace(/-/g, '')}T${new Date(data.time).toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${data.date.replace(/-/g, '')}T${new Date(new Date(data.time).getTime() + (data.serviceDuration || 30) * 60000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;

  return (
    <div className="max-w-lg mx-auto py-12 px-4 space-y-8">
      <div className="text-center space-y-3">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h1 className="text-3xl font-bold">Appointment Confirmed!</h1>
        <p className="text-muted-foreground">
          Your appointment has been booked successfully. A confirmation will be sent to {data.customerEmail}.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {data.serviceName && (
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium">{data.serviceName}</p>
                {data.serviceDuration && (
                  <p className="text-sm text-muted-foreground">{data.serviceDuration} minutes</p>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
            <p className="font-medium">{dateStr}</p>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
            <p className="font-medium">{timeStr}</p>
          </div>
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="font-medium">{data.customerName}</p>
              <p className="text-sm text-muted-foreground">{data.customerEmail} · {data.customerPhone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <a href={googleCalUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="w-full">Add to Google Calendar</Button>
        </a>
        <Link href={`/${slug}`}>
          <Button variant="outline" className="w-full">Back to Home</Button>
        </Link>
        <Link href={`/${slug}/book`}>
          <Button className="w-full">Book Another Appointment</Button>
        </Link>
      </div>
    </div>
  );
}
