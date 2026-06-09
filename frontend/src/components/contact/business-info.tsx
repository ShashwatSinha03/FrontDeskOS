import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { PublicBusinessData } from '@/lib/api';

export function BusinessInfo({ business }: { business: PublicBusinessData }) {
  const details = [
    { icon: MapPin, label: 'Address', value: business.address || 'No address on file' },
    { icon: Phone, label: 'Phone', value: business.phone || 'No phone on file' },
    { icon: Mail, label: 'Email', value: business.email || 'No email on file' },
    { icon: Clock, label: 'Hours', value: 'Mon–Fri: 9:00 AM – 6:00 PM\nSat: 9:00 AM – 2:00 PM\nSun: Closed' },
  ];

  return (
    <div className="space-y-4">
      {details.map((item) => (
        <Card key={item.label}>
          <CardContent className="flex items-start gap-4 pt-6">
            <item.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">{item.label}</h3>
              <p className="mt-1 text-sm whitespace-pre-line">{item.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
