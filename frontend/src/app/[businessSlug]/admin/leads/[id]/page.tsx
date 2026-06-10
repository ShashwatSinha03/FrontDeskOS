'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { CustomerDetail } from '@/components/admin/customer-detail';

export default function CustomerDetailPage() {
  const params = useParams();
  const slug = params.businessSlug as string;
  const customerId = params.id as string;

  return (
    <div className="space-y-6">
      <Link
        href={`/${slug}/admin/leads`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Leads
      </Link>

      <CustomerDetail customerId={customerId} />
    </div>
  );
}
