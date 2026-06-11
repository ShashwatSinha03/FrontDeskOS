import { createClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function founderFetcher(url: string, options?: RequestInit) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No session');
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${session.access_token}`,
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  return res.json();
}

export function founderUrl(path: string) {
  return `${API_URL}${path}`;
}
