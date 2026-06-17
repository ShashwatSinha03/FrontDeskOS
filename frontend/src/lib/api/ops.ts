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

async function opsFetch(path: string, options?: RequestInit) {
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

export async function getEscalations(params?: { status?: string; search?: string; page?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.status && params.status !== 'all') q.set('status', params.status);
  if (params?.search) q.set('search', params.search);
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

export async function getConversations(params?: {
  search?: string;
  channel?: string;
  workflowState?: string;
  escalated?: boolean;
  page?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.channel) q.set('channel', params.channel);
  if (params?.workflowState) q.set('workflowState', params.workflowState);
  if (params?.escalated) q.set('escalated', 'true');
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return opsFetch(`/operate/conversations${qs ? `?${qs}` : ''}`);
}

export async function getConversationDetail(id: string) {
  return opsFetch(`/operate/conversations/${id}`);
}

export async function getDeliveryHealth() {
  return opsFetch('/operate/deliveries/health');
}

export async function getFailedDeliveries(params?: { page?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return opsFetch(`/operate/deliveries/failed${qs ? `?${qs}` : ''}`);
}

export async function getActivity(params?: { limit?: number }) {
  const q = new URLSearchParams();
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return opsFetch(`/operate/activity${qs ? `?${qs}` : ''}`);
}

// ── Inbox API ──────────────────────────────────────────────────────────────────

export async function getInboxConversations(params?: {
  ownershipStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (params?.ownershipStatus) q.set('ownershipStatus', params.ownershipStatus);
  if (params?.search) q.set('search', params.search);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return opsFetch(`/inbox/conversations${qs ? `?${qs}` : ''}`);
}

export async function getInboxCounts() {
  return opsFetch('/inbox/counts');
}

export async function joinInboxConversation(conversationId: string) {
  return opsFetch(`/inbox/conversations/${conversationId}/join`, { method: 'POST' });
}

export async function returnInboxToAI(conversationId: string) {
  return opsFetch(`/inbox/conversations/${conversationId}/return-to-ai`, { method: 'POST' });
}

export async function sendInboxMessage(conversationId: string, content: string) {
  return opsFetch(`/inbox/conversations/${conversationId}/message`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}
