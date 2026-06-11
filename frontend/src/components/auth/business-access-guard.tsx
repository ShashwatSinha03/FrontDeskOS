'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMembership } from '@/hooks/use-membership';

interface Props {
  businessId: string;
  children: React.ReactNode;
}

export function BusinessAccessGuard({ businessId, children }: Props) {
  const router = useRouter();
  const { membership, loading } = useMembership();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!membership || membership.businessId !== businessId) {
      router.replace('/unauthorized');
    } else {
      setChecked(true);
    }
  }, [membership, loading, businessId, router]);

  if (loading || !checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking access...</p>
      </div>
    );
  }

  return <>{children}</>;
}
