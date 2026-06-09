'use client';

import { useParams } from 'next/navigation';
import { useBusiness } from '@/hooks/use-business';
import { BusinessInfo } from '@/components/contact/business-info';
import { ContactForm } from '@/components/contact/contact-form';

export default function ContactPage() {
  const params = useParams();
  const slug = params.businessSlug as string;
  const { business, isLoading } = useBusiness(slug);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {business ? `Get in touch with ${business.name}` : "We'd love to hear from you"}
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        {business && <BusinessInfo business={business} />}
        <ContactForm slug={slug} businessId={business?.id || ''} />
      </div>
    </div>
  );
}
