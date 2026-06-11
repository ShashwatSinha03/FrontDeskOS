'use client';

import { useParams } from 'next/navigation';
import { useBusiness } from '@/hooks/use-business';
import { BusinessInfo } from '@/components/contact/business-info';
import { Skeleton } from '@/components/design/skeleton';

export default function ContactPage() {
  const params = useParams();
  const slug = params.businessSlug as string;
  const { business, isLoading } = useBusiness(slug);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="space-y-3 mb-12">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="mx-auto max-w-xl space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      <div className="max-w-xl mb-12">
        <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
        <p className="mt-3 text-base text-muted-foreground">
          {business ? `Get in touch with ${business.name}` : "We'd love to hear from you"}
        </p>
      </div>
      <div className="mx-auto max-w-xl">
        {business && <BusinessInfo business={business} />}
      </div>
    </div>
  );
}
