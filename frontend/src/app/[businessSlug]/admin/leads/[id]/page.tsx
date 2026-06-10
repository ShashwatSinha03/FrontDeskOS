'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomerDetail } from '@/components/admin/customer-detail';

export default function CustomerDetailPage() {
  const params = useParams();
  const slug = params.businessSlug as string;
  const customerId = params.id as string;

  return (
    <div className="space-y-6">
      <Button variant="link" asChild className="px-0">
        <Link href={`/${slug}/admin/leads`} className="inline-flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" />
          Back to Leads
        </Link>
      </Button>

      <CustomerDetail customerId={customerId} />
    </div>
  );
}
