'use client';

import { useParams } from 'next/navigation';
import { useBusiness } from '@/hooks/use-business';
import { HeroSection } from '@/components/home/hero';
import { ServicesOverview } from '@/components/home/services-overview';
import { AboutSection } from '@/components/home/about-section';
import { CtaBanner } from '@/components/home/cta-banner';
import { AiAssistant } from '@/components/chat/assistant-section';

export default function HomePage() {
  const params = useParams();
  const slug = params.businessSlug as string;
  const { business, isLoading, error } = useBusiness(slug);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Unable to load clinic information.</p>
      </div>
    );
  }

  return (
    <>
      <HeroSection businessName={business.name} slug={slug} />
      <ServicesOverview services={business.services} slug={slug} />
      <AboutSection />
      <CtaBanner slug={slug} />
      <AiAssistant />
    </>
  );
}
