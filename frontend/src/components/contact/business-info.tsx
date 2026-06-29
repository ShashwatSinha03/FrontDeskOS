import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { PublicBusinessData } from '@/lib/api';

function formatHours(business: PublicBusinessData): string {
  const settings = (business as any).appointmentSettings;
  if (settings?.workingHours) {
    const { weekday, saturday, sunday } = settings.workingHours;
    const lines: string[] = [];
    if (weekday) lines.push(`Mon–Fri: ${weekday.start} – ${weekday.end}`);
    if (saturday) lines.push(`Sat: ${saturday.start} – ${saturday.end}`);
    if (sunday) lines.push(`Sun: ${sunday.start} – ${sunday.end}`);
    if (!saturday && !sunday && weekday) lines.push('Sat–Sun: Closed');
    if (lines.length > 0) return lines.join('\n');
  }
  return 'Contact us for hours';
}

export function BusinessInfo({ business }: { business: PublicBusinessData }) {
  const details = [
    { icon: MapPin, label: 'Address', value: business.address || 'No address on file' },
    { icon: Phone, label: 'Phone', value: business.phone || 'No phone on file' },
    { icon: Mail, label: 'Email', value: business.email || 'No email on file' },
    { icon: Clock, label: 'Hours', value: formatHours(business) },
  ];

  return (
    <div className="space-y-4">
      {details.map((item) => (
        <Card key={item.label} className="product-card">
          <CardContent className="flex items-start gap-4 pt-6">
            <item.icon className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium text-sm text-zinc-400">{item.label}</h3>
              <p className="mt-1 text-sm text-white whitespace-pre-line">{item.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
