const ADMIN_API_URL = '/api/admin';

export interface TemplateService {
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  category: string;
}

export interface TemplateFaq {
  question: string;
  answer: string;
  category: string;
}

export interface TemplateDayHours {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface IndustryTemplate {
  version: string;
  industry: string;
  label: string;
  suggestedServices: TemplateService[];
  suggestedFaqs: TemplateFaq[];
  defaultHours: TemplateDayHours[];
  suggestedGreeting: string;
  escalationRules: {
    autoEscalateKeywords: string[];
    alertMethods: string[];
    notifyEmail: string;
    inactivityTimeoutMinutes: number;
  };
  slotDurationMinutes: number;
}

export interface PublishRequest {
  sessionId: string;
  business: {
    name: string;
    slug: string;
    tagline?: string;
    description?: string;
    phone?: string;
    email?: string;
    address?: string;
    timezone?: string;
  };
  services: {
    name: string;
    description?: string;
    durationMinutes: number;
    price: number;
    category?: string;
  }[];
  hours: {
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }[];
  faqs: {
    question: string;
    answer: string;
    category?: string;
  }[];
  ai: {
    greeting: string;
    escalationEmail: string;
    slotDurationMinutes: number;
    autoEscalateKeywords?: string[];
  };
  industryTemplate: string;
  templateVersion: string;
}

export interface PublishResult {
  idempotent: boolean;
  businessId: string;
  slug: string;
  tenantUrl: string;
  adminUrl: string;
  bookingUrl: string;
  createdAt: string;
}

export interface OwnerInviteResult {
  ownerId: string | null;
  email: string;
  name: string;
  dashboardUrl: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: { path: string[]; message: string }[];
}

export async function fetchIndustryList(): Promise<{ id: string; label: string }[]> {
  const res = await fetch(`${ADMIN_API_URL}/onboarding/templates/list`);
  const json: ApiResponse<{ id: string; label: string }[]> = await res.json();
  if (!json.success || !json.data) throw new Error(json.error || 'Failed to load industries');
  return json.data;
}

export async function fetchIndustryTemplate(industry: string): Promise<IndustryTemplate> {
  const res = await fetch(`${ADMIN_API_URL}/onboarding/templates/${industry}`);
  const json: ApiResponse<IndustryTemplate> = await res.json();
  if (!json.success || !json.data) throw new Error(json.error || 'Failed to load template');
  return json.data;
}

export async function publishTenant(payload: PublishRequest): Promise<PublishResult> {
  const res = await fetch(`${ADMIN_API_URL}/onboarding/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json: ApiResponse<PublishResult> = await res.json();
  if (!json.success) {
    const msg = json.errors?.[0]?.message || json.error || 'Failed to publish';
    throw new Error(msg);
  }
  if (!json.data) throw new Error('No data returned');
  return json.data;
}

export async function createOwnerInvite(businessId: string, name: string, email: string): Promise<OwnerInviteResult> {
  const res = await fetch(`${ADMIN_API_URL}/onboarding/owner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessId, name, email }),
  });
  const json: ApiResponse<OwnerInviteResult> = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to create owner');
  }
  if (!json.data) throw new Error('No data returned');
  return json.data;
}
