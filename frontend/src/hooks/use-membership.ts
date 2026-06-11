'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchMembership, Membership } from '@/lib/api/membership';

export function useMembership() {
  const { user } = useAuth();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMembership = useCallback(async () => {
    if (!user) {
      setMembership(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const m = await fetchMembership();
    setMembership(m);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refreshMembership();
  }, [refreshMembership]);

  return { membership, loading, refreshMembership };
}
