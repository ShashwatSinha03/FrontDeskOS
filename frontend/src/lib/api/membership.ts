import { createClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface Membership {
  userId: string;
  businessId: string;
  role: 'owner' | 'staff';
  status: 'active' | 'invited' | 'suspended';
}

export async function fetchMembership(): Promise<Membership | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return null;
  }

  const res = await fetch(`${API_URL}/me/membership`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const json = await res.json();
  return json.success ? (json.data ?? null) : null;
}
