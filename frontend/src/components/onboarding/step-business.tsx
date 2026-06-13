'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface BusinessData {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  timezone: string;
}

interface StepBusinessProps {
  data: BusinessData;
  onChange: (data: BusinessData) => void;
  onNext: () => void;
  onBack: () => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

export function StepBusiness({ data, onChange, onNext, onBack }: StepBusinessProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const update = (field: keyof BusinessData, value: string) => {
    const next = { ...data, [field]: value };
    if (field === 'name' && !data.slug.startsWith(value.slice(0, -1))) {
      next.slug = slugify(value);
    }
    onChange(next);
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  useEffect(() => {
    const e: Record<string, string> = {};
    if (touched.name && !data.name.trim()) e.name = 'Business name is required';
    if (touched.slug && !data.slug.trim()) e.slug = 'URL slug is required';
    if (touched.slug && data.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.slug)) {
      e.slug = 'Slug must be lowercase with hyphens only';
    }
    if (touched.email && !data.email.trim()) e.email = 'Email is required';
    if (touched.email && data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      e.email = 'Invalid email format';
    }
    setErrors(e);
  }, [data, touched]);

  const isValid = data.name.trim() && data.slug.trim() && data.email.trim()
    && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.slug)
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Business Information</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tell us about the business you're onboarding.</p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Business Name</label>
              <Input
                placeholder="Peak Performance Gym"
                value={data.name}
                onChange={(e) => update('name', e.target.value)}
                onBlur={() => handleBlur('name')}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">URL Slug</label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>nevuraos.vercel.app/</span>
                <Input
                  className="w-64"
                  placeholder="peak-performance-gym"
                  value={data.slug}
                  onChange={(e) => update('slug', e.target.value)}
                  onBlur={() => handleBlur('slug')}
                />
              </div>
              {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Tagline</label>
              <Input
                placeholder="Train Like an Athlete"
                value={data.tagline}
                onChange={(e) => update('tagline', e.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="flex h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                placeholder="Tell customers about your business..."
                value={data.description}
                onChange={(e) => update('description', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="info@business.com"
                value={data.email}
                onChange={(e) => update('email', e.target.value)}
                onBlur={() => handleBlur('email')}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                placeholder="+91 98765 43210"
                value={data.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Address</label>
              <Input
                placeholder="123, MG Road, Bangalore"
                value={data.address}
                onChange={(e) => update('address', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button disabled={!isValid} onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
}
