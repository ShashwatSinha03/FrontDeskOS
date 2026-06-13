const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function getToken(): Promise<string> {
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No session');
  return session.access_token;
}

function getCurrentSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/([^/]+)\/admin/);
  return match?.[1] || null;
}

async function notifFetch(path: string, options?: RequestInit) {
  const token = await getToken();
  const slug = getCurrentSlug();
  const url = slug
    ? `${API_URL}${path}${path.includes('?') ? '&' : '?'}slug=${encodeURIComponent(slug)}`
    : `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  return res.json();
}

export async function getNotifications(params?: { page?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return notifFetch(`/notifications${qs ? `?${qs}` : ''}`);
}

export async function getUnreadCount() {
  return notifFetch('/notifications/unread-count');
}

export async function markRead(id: string) {
  return notifFetch(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllRead() {
  return notifFetch('/notifications/read-all', { method: 'PATCH' });
}
