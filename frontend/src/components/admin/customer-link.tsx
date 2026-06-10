'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export function CustomerLink({
  customerId,
  customerName,
  children,
}: {
  customerId: string;
  customerName?: string | null;
  children?: React.ReactNode;
}) {
  const params = useParams();
  const slug = params.businessSlug as string;

  return (
    <Link
      href={`/${slug}/admin/leads/${customerId}`}
      className="text-primary hover:text-primary/80 font-medium transition-colors"
    >
      {children || customerName || 'View Customer'}
    </Link>
  );
}
