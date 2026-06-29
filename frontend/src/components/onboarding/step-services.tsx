'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { TemplateService } from '@/lib/onboarding';

interface StepServicesProps {
  services: TemplateService[];
  onChange: (services: TemplateService[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepServices({ services, onChange, onNext, onBack }: StepServicesProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (index: number, field: keyof TemplateService, value: string | number) => {
    const next = services.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(services.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([
      ...services,
      { name: '', description: '', durationMinutes: 30, price: 0, category: '' },
    ]);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (services.length === 0) {
      e.general = 'At least one service is required';
    }
    services.forEach((s, i) => {
      if (!s.name.trim()) e[`name_${i}`] = 'Name is required';
      if (!s.durationMinutes || s.durationMinutes < 5) e[`duration_${i}`] = 'Min 5 minutes';
      if (s.price == null || s.price < 0) e[`price_${i}`] = 'Price must be 0 or more';
    });
    setErrors(e);
    if (Object.keys(e).length === 0) onNext();
  };

  const categories = ['Training', 'Classes', 'Wellness', 'Hair', 'Skincare', 'Nails', 'Makeup', 'Massage', 'Body', 'General', 'Consulting', 'Membership'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Services</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add the services this business offers. Add at least one.
        </p>
      </div>

      {errors.general && (
        <p className="text-sm text-destructive">{errors.general}</p>
      )}

      <div className="space-y-3">
        {services.map((svc, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Service Name</label>
                      <Input
                        placeholder="Personal Training"
                        value={svc.name}
                        onChange={(e) => update(i, 'name', e.target.value)}
                      />
                      {errors[`name_${i}`] && <p className="text-xs text-destructive">{errors[`name_${i}`]}</p>}
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Description</label>
                      <Input
                        placeholder="One-on-one session with a certified trainer"
                        value={svc.description}
                        onChange={(e) => update(i, 'description', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Duration (min)</label>
                      <Input
                        type="number"
                        min={5}
                        value={svc.durationMinutes}
                        onChange={(e) => update(i, 'durationMinutes', parseInt(e.target.value) || 0)}
                      />
                      {errors[`duration_${i}`] && <p className="text-xs text-destructive">{errors[`duration_${i}`]}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Price (₹)</label>
                      <Input
                        type="number"
                        min={0}
                        value={svc.price}
                        onChange={(e) => update(i, 'price', parseFloat(e.target.value) || 0)}
                      />
                      {errors[`price_${i}`] && <p className="text-xs text-destructive">{errors[`price_${i}`]}</p>}
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Category</label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={svc.category}
                        onChange={(e) => update(i, 'category', e.target.value)}
                      >
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(i)}
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" onClick={add} className="w-full">
        + Add Service
      </Button>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={validate}>Continue</Button>
      </div>
    </div>
  );
}
