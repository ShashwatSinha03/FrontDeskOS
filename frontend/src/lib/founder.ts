const ADMIN_API_URL = '/api/admin/founder';

export interface FounderBusiness {
  id: string;
  name: string;
  slug: string;
  businessType: string;
  phone: string | null;
  email: string | null;
  timezone: string;
  createdAt: string;
  health: 'healthy' | 'attention' | 'critical';
  leadCount: number;
  appointmentCount: number;
  escalationCount: number;
  serviceCount: number;
  faqCount: number;
  planName: string | null;
  planStatus: string | null;
  hasRecentActivity: boolean;
}

export interface FounderBusinessDetail extends FounderBusiness {
  recentLeads: FounderLead[];
  recentAppointments: FounderAppointment[];
  recentEscalations: FounderEscalation[];
}

export interface FounderOverview {
  totalBusinesses: number;
  activeBusinesses: number;
  leadsToday: number;
  leadsThisWeek: number;
  totalLeads: number;
  appointmentsToday: number;
  appointmentsThisWeek: number;
  pendingEscalations: number;
  monthlyRevenue: number;
  businessesByHealth: { healthy: number; attention: number; critical: number };
}

export interface FounderLead {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  customerName: string | null;
  email: string | null;
  phone: string | null;
  lifecycleState: string;
  lastInteractionAt: string | null;
  createdAt: string;
}

export interface FounderAppointment {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  customerName: string | null;
  serviceName: string | null;
  appointmentTime: string;
  status: string;
  createdAt: string;
}

export interface FounderEscalation {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  customerName: string | null;
  reason: string;
  status: string;
  createdAt: string;
}

export interface FounderSubscription {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  planName: string;
  planType: string;
  status: string;
  amount: number;
  currency: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  createdAt: string;
}

export interface ActivityEvent {
  type: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  summary: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'API request failed');
  return json;
}

export async function fetchOverview(): Promise<{ success: boolean; data: FounderOverview }> {
  return fetcher(`${ADMIN_API_URL}/overview`);
}

export async function fetchBusinesses(params: {
  page?: number; limit?: number; search?: string; plan?: string;
}): Promise<PaginatedResponse<FounderBusiness>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.plan) qs.set('plan', params.plan);
  return fetcher(`${ADMIN_API_URL}/businesses?${qs}`);
}

export async function fetchBusiness(id: string): Promise<{ success: boolean; data: FounderBusinessDetail }> {
  return fetcher(`${ADMIN_API_URL}/businesses/${id}`);
}

export async function fetchLeads(params: {
  page?: number; limit?: number; search?: string; businessId?: string; status?: string;
}): Promise<PaginatedResponse<FounderLead>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.businessId) qs.set('businessId', params.businessId);
  if (params.status) qs.set('status', params.status);
  return fetcher(`${ADMIN_API_URL}/leads?${qs}`);
}

export async function fetchAppointments(params: {
  page?: number; limit?: number; search?: string; businessId?: string; status?: string;
}): Promise<PaginatedResponse<FounderAppointment>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.businessId) qs.set('businessId', params.businessId);
  if (params.status) qs.set('status', params.status);
  return fetcher(`${ADMIN_API_URL}/appointments?${qs}`);
}

export async function fetchEscalations(params: {
  page?: number; limit?: number; search?: string; businessId?: string; status?: string;
}): Promise<PaginatedResponse<FounderEscalation>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.businessId) qs.set('businessId', params.businessId);
  if (params.status) qs.set('status', params.status);
  return fetcher(`${ADMIN_API_URL}/escalations?${qs}`);
}

export async function fetchSubscriptions(params: {
  page?: number; limit?: number; status?: string;
}): Promise<PaginatedResponse<FounderSubscription>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.status) qs.set('status', params.status);
  return fetcher(`${ADMIN_API_URL}/subscriptions?${qs}`);
}

export async function createSubscription(data: {
  businessId: string; planName: string; planType: string; amount: number;
  currency?: string; billingCycle?: string; trialEnd?: string;
}): Promise<{ success: boolean; data: FounderSubscription }> {
  const res = await fetch(`${ADMIN_API_URL}/subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to create subscription');
  return json;
}

export async function updateSubscription(id: string, data: {
  planName?: string; planType?: string; status?: string; amount?: number; billingCycle?: string; currentPeriodEnd?: string;
}): Promise<void> {
  const res = await fetch(`${ADMIN_API_URL}/subscriptions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to update subscription');
}

export async function fetchActivity(limit = 20): Promise<{ success: boolean; data: ActivityEvent[] }> {
  return fetcher(`${ADMIN_API_URL}/activity?limit=${limit}`);
}

export interface SubscriptionHealth {
  mrr: number;
  activeCount: number;
  pastDueCount: number;
  suspendedCount: number;
  cancelledCount: number;
  totalCount: number;
  statusDistribution: Record<string, number>;
}

export interface BillingEvent {
  id: string;
  subscription_id: string;
  business_id: string;
  event_type: string;
  previous_status: string | null;
  new_status: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export async function fetchSubscriptionHealth(): Promise<{ success: boolean; data: SubscriptionHealth }> {
  return fetcher(`${ADMIN_API_URL}/subscriptions/health`);
}

export async function fetchSubscriptionEvents(id: string): Promise<{ success: boolean; data: BillingEvent[] }> {
  return fetcher(`${ADMIN_API_URL}/subscriptions/${id}/events`);
}

export async function changeSubscriptionStatus(id: string, status: string, note?: string): Promise<void> {
  const res = await fetch(`${ADMIN_API_URL}/subscriptions/${id}/change-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, note }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to change status');
}

export async function updateBillingNotes(id: string, notes: string): Promise<void> {
  const res = await fetch(`${ADMIN_API_URL}/subscriptions/${id}/notes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to update notes');
}
