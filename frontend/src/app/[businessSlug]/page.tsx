'use client';

import { useParams } from 'next/navigation';
import { useBusiness } from '@/hooks/use-business';
import { HeroSection } from '@/components/home/hero';
import { ServicesOverview } from '@/components/home/services-overview';
import { AboutSection } from '@/components/home/about-section';
import { FaqSection } from '@/components/home/faq-section';
import { CtaBanner } from '@/components/home/cta-banner';
import { AiAssistant } from '@/components/chat/assistant-section';
import { Skeleton } from '@/components/design/skeleton';
import { EmptyState } from '@/components/design/empty-state';
import { AlertCircle } from 'lucide-react';

export default function HomePage() {
  const params = useParams();
  const slug = params.businessSlug as string;
  const { business, isLoading, error } = useBusiness(slug);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 space-y-6">
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-6 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-12">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Unable to load information"
        description="We could not load this business. Please check the URL and try again."
      />
    );
  }

  return (
    <>
      <HeroSection businessName={business.name} slug={slug} description={business.description} />
      <ServicesOverview services={business.services} slug={slug} businessName={business.name} />
      <AboutSection businessName={business.name} description={business.description} />
      <FaqSection faqs={business.faqs} />
      <CtaBanner slug={slug} businessName={business.name} />
      <AiAssistant />
    </>
  );
}
