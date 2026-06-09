'use client';

import { useParams } from 'next/navigation';
import { useServices } from '@/hooks/use-services';
import { ServiceCard } from '@/components/services/service-card';

export default function ServicesPage() {
  const params = useParams();
  const slug = params.businessSlug as string;
  const { services, isLoading, error } = useServices(slug);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading services...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Unable to load services.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight">Our Services</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Comprehensive dental care for the whole family
        </p>
      </div>
      {services.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No services available at this time.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} slug={slug} />
          ))}
        </div>
      )}
    </div>
  );
}
