'use client';

import { useDemo, useDemoStore } from '@/lib/demo/stores/demo-provider';
import { CalendarCheck } from 'lucide-react';

export default function DemoAppointmentsPage() {
  const { appointments } = useDemo();
  const all = useDemoStore(appointments, () => appointments.appointments);
  const upcoming = useDemoStore(appointments, () => appointments.upcoming);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Appointments</h1>
      <p className="mt-1 text-sm text-zinc-500">{upcoming.length} upcoming · {all.length} total</p>
      <div className="mt-6 space-y-3">
        {all.map((apt) => (
          <div key={apt.id} className="flex items-center gap-4 product-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/10 text-blue-400">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{apt.service}</p>
              <p className="text-sm text-zinc-500">{apt.customerName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-zinc-300">{apt.date}</p>
              <p className="text-xs text-zinc-500">{apt.time}</p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              apt.status === 'confirmed' ? 'bg-green-500/10 text-green-400' :
              apt.status === 'completed' ? 'bg-zinc-800 text-zinc-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {apt.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
