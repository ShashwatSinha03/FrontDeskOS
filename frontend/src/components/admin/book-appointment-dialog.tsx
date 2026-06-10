'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchPublicBusiness, fetchPublicServices, fetchAvailableSlots, adminBookAppointment } from '@/lib/api';
import { Button } from '@/components/ui/button';

export function BookAppointmentDialog({
  customerId, open, onClose, onSuccess,
}: {
  customerId: string; open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const params = useParams();
  const slug = params.businessSlug as string;
  const [serviceId, setServiceId] = useState<string>('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: bizData } = useSWR(slug ? `babiz-${slug}` : null, () =>
    fetchPublicBusiness(slug), { revalidateOnFocus: false }
  );
  const businessId = bizData?.success && bizData.data ? bizData.data.id : null;

  const { data: servicesData } = useSWR(
    slug ? `basvc-${slug}` : null, () => fetchPublicServices(slug), { revalidateOnFocus: false }
  );
  const services = servicesData?.success ? servicesData.data || [] : [];

  const { data: slotsData } = useSWR(
    businessId && date && serviceId ? `baslots-${businessId}-${date}-${serviceId}` : null,
    () => fetchAvailableSlots(businessId!, date, serviceId || undefined),
    { revalidateOnFocus: false }
  );
  const slots = slotsData?.success ? slotsData.data || [] : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !date || !time) return;
    setSaving(true);
    setError(null);
    try {
      const res = await adminBookAppointment({
        customerId, businessId,
        serviceId: serviceId || null,
        appointmentTime: `${date}T${time}`,
        notes: notes.trim() || undefined,
      });
      if (res.success) {
        setServiceId(''); setDate(''); setTime(''); setNotes('');
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Booking failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="rounded-xl bg-card p-6 shadow-lg max-w-md w-full mx-4 border">
        <h2 className="text-lg font-semibold mb-4">Book Appointment</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <select
            value={serviceId} onChange={(e) => setServiceId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Any Service</option>
            {services.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes}min)</option>
            ))}
          </select>
          <input
            type="date" value={date} onChange={(e) => setDate(e.target.value)} required
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <select
            value={time} onChange={(e) => setTime(e.target.value)} required
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            disabled={!date}
          >
            <option value="">Select time</option>
            {slots.map((slot: any) => (
              <option key={slot.time} value={slot.time}>{slot.time}</option>
            ))}
          </select>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving || !date || !time}>
              {saving ? 'Booking...' : 'Book Appointment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
