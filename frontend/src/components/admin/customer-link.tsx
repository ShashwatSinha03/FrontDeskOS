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
      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
    >
      {children || customerName || 'View Customer'}
    </Link>
  );
}
