import {
  Customer,
  CustomerLifecycleState,
  Conversation,
  Message,
  Appointment,
  AppointmentStatus,
  Escalation,
  EscalationStatus,
  KnowledgeRequest,
  KnowledgeRequestStatus,
  FollowUp,
  FollowUpStatus,
  FollowUpType,
  AvailabilitySchedule,
  AvailabilityOverride,
  RecoveryConfig,
} from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Unified response payload format
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: any[];
  meta?: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}

export interface DashboardSummary {
  leadStateBreakdown: Record<string, number>;
  totalLeads: number;
  pendingEscalations: number;
  pendingKnowledgeRequests: number;
  appointmentsToday: number;
  conversionRate: number;
}

/**
 * Send an inquiry message from the client-side floating widget.
 */
export async function sendChatMessage(payload: {
  businessId: string;
  channelType: 'web_chat' | 'whatsapp' | 'voice';
  channelIdentity: string;
  content: string;
  sessionId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}): Promise<ApiResponse<{
  conversation: Conversation;
  customer: Customer;
  userMessage: Message;
  replyMessage: Message;
}>> {
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}

/**
 * Fetch all leads for a business.
 */
export async function fetchLeads(
  businessId: string,
  state?: CustomerLifecycleState,
  search?: string,
  page?: number,
  limit?: number
): Promise<ApiResponse<Customer[]>> {
  const url = new URL(`${API_URL}/leads`);
  url.searchParams.append('businessId', businessId);
  if (state) url.searchParams.append('state', state);
  if (search) url.searchParams.append('search', search);
  if (page) url.searchParams.append('page', String(page));
  if (limit) url.searchParams.append('limit', String(limit));
  const response = await fetch(url.toString());
  return response.json();
}

/**
 * Fetch human-takeover escalations for a clinic.
 */
export async function fetchEscalations(
  businessId: string,
  status?: EscalationStatus,
  page?: number,
  limit?: number
): Promise<ApiResponse<Escalation[]>> {
  const url = new URL(`${API_URL}/escalations`);
  url.searchParams.append('businessId', businessId);
  if (status) url.searchParams.append('status', status);
  if (page) url.searchParams.append('page', String(page));
  if (limit) url.searchParams.append('limit', String(limit));
  const response = await fetch(url.toString());
  return response.json();
}

/**
 * Mark a human takeover escalation as resolved.
 */
export async function resolveEscalation(escalationId: string): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_URL}/escalations/${escalationId}/resolve`, {
    method: 'POST',
  });
  return response.json();
}

/**
 * Fetch pending unknown knowledge questions.
 */
export async function fetchKnowledgeRequests(
  businessId: string,
  status?: KnowledgeRequestStatus,
  page?: number,
  limit?: number
): Promise<ApiResponse<KnowledgeRequest[]>> {
  const url = new URL(`${API_URL}/knowledge-base/requests`);
  url.searchParams.append('businessId', businessId);
  if (status) url.searchParams.append('status', status);
  if (page) url.searchParams.append('page', String(page));
  if (limit) url.searchParams.append('limit', String(limit));
  const response = await fetch(url.toString());
  return response.json();
}

/**
 * Approve a training request, which moves the question to the clinic FAQs list.
 */
export async function approveKnowledgeRequest(
  requestId: string, 
  answer: string
): Promise<ApiResponse<KnowledgeRequest>> {
  const response = await fetch(`${API_URL}/knowledge-base/requests/${requestId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer }),
  });
  return response.json();
}

/**
 * Reject an unknown knowledge question.
 */
export async function rejectKnowledgeRequest(requestId: string): Promise<ApiResponse<KnowledgeRequest>> {
  const response = await fetch(`${API_URL}/knowledge-base/requests/${requestId}/reject`, {
    method: 'POST',
  });
  return response.json();
}

/**
 * Query open time slots on a specific date, optionally filtered by service.
 */
export async function fetchAvailableSlots(
  businessId: string,
  date: string,
  serviceId?: string
): Promise<ApiResponse<{ time: string; durationMinutes: number }[]>> {
  let url = `${API_URL}/appointments/slots?businessId=${businessId}&date=${date}`;
  if (serviceId) url += `&serviceId=${serviceId}`;
  const response = await fetch(url);
  return response.json();
}

/**
 * Manually register or book an appointment.
 */
export async function bookAppointment(payload: {
  customerId?: string;
  businessId: string;
  sessionId?: string;
  serviceId: string | null;
  appointmentTime: string; // ISO datetime
  notes?: string;
}): Promise<ApiResponse<Appointment>> {
  const response = await fetch(`${API_URL}/appointments/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}

/**
 * Cancel an appointment with an optional reason.
 */
export async function cancelAppointment(
  appointmentId: string,
  reason?: string
): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_URL}/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  return response.json();
}

/**
 * Reschedule an appointment to a new time.
 */
export async function rescheduleAppointment(
  appointmentId: string,
  newTime: string,
  notes?: string
): Promise<ApiResponse<Appointment>> {
  const response = await fetch(`${API_URL}/appointments/${appointmentId}/reschedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newTime, notes }),
  });
  return response.json();
}

/**
 * Confirm a pending appointment.
 */
export async function confirmAppointment(
  appointmentId: string
): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_URL}/appointments/${appointmentId}/confirm`, {
    method: 'POST',
  });
  return response.json();
}

// ==========================================
// Public / Customer-Facing API
// ==========================================

export interface PublicBusinessData {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  description: string | null;
  logoUrl: string | null;
  timezone: string;
  faqs: { question: string; answer: string }[];
  services: PublicServiceData[];
}

export interface PublicServiceData {
  id: string;
  name: string;
  description: string | null;
  priceMin: number;
  priceMax: number;
  durationMinutes: number;
}

export async function fetchPublicBusiness(slug: string): Promise<ApiResponse<PublicBusinessData>> {
  const response = await fetch(`${API_URL}/public/businesses/${slug}`);
  return response.json();
}

export async function fetchPublicServices(slug: string): Promise<ApiResponse<PublicServiceData[]>> {
  const response = await fetch(`${API_URL}/public/businesses/${slug}/services`);
  return response.json();
}

export async function createSession(businessId: string, sessionId?: string): Promise<ApiResponse<{ sessionId: string; customerId: string | null }>> {
  const response = await fetch(`${API_URL}/public/sessions/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessId, sessionId }),
  });
  return response.json();
}

// ==========================================
// Availability Schedule API
// ==========================================

/**
 * Fetch recurring availability schedules for a business.
 */
export async function fetchAvailabilitySchedules(
  businessId: string,
  serviceId?: string
): Promise<ApiResponse<AvailabilitySchedule[]>> {
  let url = `${API_URL}/availability/schedules?businessId=${businessId}`;
  if (serviceId) url += `&serviceId=${serviceId}`;
  const response = await fetch(url);
  return response.json();
}

/**
 * Create a recurring availability schedule.
 */
export async function createAvailabilitySchedule(payload: {
  businessId: string;
  serviceId?: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom?: string;
  effectiveUntil?: string | null;
}): Promise<ApiResponse<AvailabilitySchedule>> {
  const response = await fetch(`${API_URL}/availability/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}

/**
 * Delete a recurring availability schedule.
 */
export async function deleteAvailabilitySchedule(
  scheduleId: string
): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_URL}/availability/schedules/${scheduleId}`, {
    method: 'DELETE',
  });
  return response.json();
}

// ==========================================
// Availability Override API
// ==========================================

/**
 * Fetch date-specific availability overrides.
 */
export async function fetchAvailabilityOverrides(
  businessId: string,
  date?: string
): Promise<ApiResponse<AvailabilityOverride[]>> {
  let url = `${API_URL}/availability/overrides?businessId=${businessId}`;
  if (date) url += `&date=${date}`;
  const response = await fetch(url);
  return response.json();
}

/**
 * Create a date-specific availability override.
 */
export async function createAvailabilityOverride(payload: {
  businessId: string;
  serviceId?: string | null;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
  isAvailable?: boolean;
}): Promise<ApiResponse<AvailabilityOverride>> {
  const response = await fetch(`${API_URL}/availability/overrides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}

/**
 * Delete a date-specific availability override.
 */
export async function deleteAvailabilityOverride(
  overrideId: string
): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_URL}/availability/overrides/${overrideId}`, {
    method: 'DELETE',
  });
  return response.json();
}

// ==========================================
// Recovery Configuration API
// ==========================================

/**
 * Fetch the recovery configuration for a business.
 */
export async function fetchRecoveryConfig(
  businessId: string
): Promise<ApiResponse<RecoveryConfig>> {
  const response = await fetch(`${API_URL}/recovery/config?businessId=${businessId}`);
  return response.json();
}

/**
 * Update the recovery configuration for a business.
 */
export async function updateRecoveryConfig(
  businessId: string,
  recoveryConfig: RecoveryConfig
): Promise<ApiResponse<RecoveryConfig>> {
  const response = await fetch(`${API_URL}/recovery/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessId, recoveryConfig }),
  });
  return response.json();
}

// ==========================================
// Admin Dashboard API
// ==========================================

export async function fetchDashboardSummary(
  businessId: string
): Promise<ApiResponse<DashboardSummary>> {
  const response = await fetch(`${API_URL}/dashboard/summary?businessId=${businessId}`);
  return response.json();
}

export async function fetchAppointments(
  businessId: string,
  filters?: {
    status?: AppointmentStatus;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }
): Promise<ApiResponse<Appointment[]>> {
  const url = new URL(`${API_URL}/appointments`);
  url.searchParams.append('businessId', businessId);
  if (filters?.status) url.searchParams.append('status', filters.status);
  if (filters?.startDate) url.searchParams.append('startDate', filters.startDate);
  if (filters?.endDate) url.searchParams.append('endDate', filters.endDate);
  if (filters?.page) url.searchParams.append('page', String(filters.page));
  if (filters?.limit) url.searchParams.append('limit', String(filters.limit));
  const response = await fetch(url.toString());
  return response.json();
}

export async function fetchFollowUps(
  businessId: string,
  filters?: {
    status?: FollowUpStatus;
    type?: FollowUpType;
    page?: number;
    limit?: number;
  }
): Promise<ApiResponse<FollowUp[]>> {
  const url = new URL(`${API_URL}/follow-ups`);
  url.searchParams.append('businessId', businessId);
  if (filters?.status) url.searchParams.append('status', filters.status);
  if (filters?.type) url.searchParams.append('type', filters.type);
  if (filters?.page) url.searchParams.append('page', String(filters.page));
  if (filters?.limit) url.searchParams.append('limit', String(filters.limit));
  const response = await fetch(url.toString());
  return response.json();
}

export async function fetchConversationMessages(
  conversationId: string,
  limit?: number,
  offset?: number
): Promise<ApiResponse<Message[]>> {
  const url = new URL(`${API_URL}/conversations/${conversationId}/messages`);
  if (limit) url.searchParams.append('limit', String(limit));
  if (offset) url.searchParams.append('offset', String(offset));
  const response = await fetch(url.toString());
  return response.json();
}
