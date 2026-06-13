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

async function analyticsFetch(path: string) {
  const token = await getToken();
  const slug = getCurrentSlug();
  const url = slug
    ? `${API_URL}${path}${path.includes('?') ? '&' : '?'}slug=${encodeURIComponent(slug)}`
    : `${API_URL}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function getAnalyticsOverview() {
  return analyticsFetch('/analytics/overview');
}

export async function getAnalyticsServices() {
  return analyticsFetch('/analytics/services');
}

export async function getAnalyticsTrends(range = '30d') {
  return analyticsFetch(`/analytics/trends?range=${range}`);
}

export async function getAnalyticsFunnel() {
  return analyticsFetch('/analytics/funnel');
}
