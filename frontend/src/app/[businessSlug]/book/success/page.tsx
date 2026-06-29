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
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/30">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
        </div>
        <h1 className="text-xl font-semibold text-white">Appointment Confirmed</h1>
        <p className="text-sm text-zinc-400">Your appointment was booked successfully.</p>
        <Link href={`/${slug}`}>
          <Button className="bg-blue-600/80 text-white hover:bg-blue-500/80">Back to Home</Button>
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
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/30">
            <CheckCircle className="h-7 w-7 text-green-500" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Appointment Confirmed!</h1>
          <p className="mt-2 text-sm text-zinc-400">
            A confirmation will be sent to {data.customerEmail}.
          </p>
        </div>
      </div>

      <Card className="product-card">
        <CardContent className="divide-y divide-zinc-800 p-0">
          {data.serviceName && (
            <div className="flex items-center gap-3 px-5 py-4">
              <Calendar className="h-4 w-4 text-zinc-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">{data.serviceName}</p>
                {data.serviceDuration && (
                  <p className="text-xs text-zinc-400">{data.serviceDuration} minutes</p>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 px-5 py-4">
            <Calendar className="h-4 w-4 text-zinc-400 shrink-0" />
            <p className="text-sm font-medium text-white">{dateStr}</p>
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <Clock className="h-4 w-4 text-zinc-400 shrink-0" />
            <p className="text-sm font-medium text-white">{timeStr}</p>
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <User className="h-4 w-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">{data.customerName}</p>
              <p className="text-xs text-zinc-400">{data.customerEmail} &middot; {data.customerPhone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2.5">
        <a href={googleCalUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">Add to Google Calendar</Button>
        </a>
        <Link href={`/${slug}`}>
          <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">Back to Home</Button>
        </Link>
        <Link href={`/${slug}/book`}>
          <Button className="w-full bg-blue-600/80 text-white hover:bg-blue-500/80">Book Another Appointment</Button>
        </Link>
      </div>
    </div>
  );
}
