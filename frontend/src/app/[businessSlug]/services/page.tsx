'use client';

import { useParams } from 'next/navigation';
import { useBusiness } from '@/hooks/use-business';
import { useServices } from '@/hooks/use-services';
import { ServiceCard } from '@/components/services/service-card';
import { Skeleton } from '@/components/design/skeleton';
import { EmptyState } from '@/components/design/empty-state';
import { AlertCircle, Package } from 'lucide-react';

export default function ServicesPage() {
  const params = useParams();
  const slug = params.businessSlug as string;
  const { business } = useBusiness(slug);
  const { services, isLoading, error } = useServices(slug);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="space-y-3 mb-12">
          <Skeleton className="h-8 w-48 bg-zinc-800" />
          <Skeleton className="h-5 w-80 bg-zinc-800" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Unable to load services"
        description="Something went wrong. Please try again later."
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      <div className="max-w-xl mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-white">Our Services</h1>
        {business && (
          <p className="mt-3 text-base text-zinc-400">
            Services offered by {business.name}.
          </p>
        )}
      </div>
      {services.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No services available"
          description="Check back soon for updates."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} slug={slug} />
          ))}
        </div>
      )}
    </div>
  );
}
