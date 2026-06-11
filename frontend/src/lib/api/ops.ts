const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function getToken(): Promise<string> {
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No session');
  return session.access_token;
}

async function opsFetch(path: string, options?: RequestInit) {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  return res.json();
}

export async function getDashboard() {
  return opsFetch('/operate/dashboard');
}

export async function getLeads(params?: { state?: string; search?: string; page?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.state && params.state !== 'all') q.set('state', params.state);
  if (params?.search) q.set('search', params.search);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return opsFetch(`/operate/leads${qs ? `?${qs}` : ''}`);
}

export async function updateLeadLifecycle(id: string, lifecycleState: string) {
  return opsFetch(`/operate/leads/${id}/lifecycle`, {
    method: 'PATCH',
    body: JSON.stringify({ lifecycleState }),
  });
}

export async function getAppointments(params?: { status?: string; page?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.status && params.status !== 'all') q.set('status', params.status);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return opsFetch(`/operate/appointments${qs ? `?${qs}` : ''}`);
}

export async function updateAppointmentStatus(id: string, status: string) {
  return opsFetch(`/operate/appointments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function rescheduleAppointment(id: string, appointmentTime: string, notes?: string) {
  return opsFetch(`/operate/appointments/${id}/reschedule`, {
    method: 'PATCH',
    body: JSON.stringify({ appointmentTime, notes }),
  });
}

export async function getEscalations(params?: { status?: string; page?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.status && params.status !== 'all') q.set('status', params.status);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return opsFetch(`/operate/escalations${qs ? `?${qs}` : ''}`);
}

export async function resolveEscalation(id: string, resolutionNote?: string) {
  return opsFetch(`/operate/escalations/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolutionNote }),
  });
}
