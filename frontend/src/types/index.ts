// FrontDeskOS Frontend - Shared Domain Types & Interfaces

export type CustomerLifecycleState =
  | 'New Inquiry'
  | 'Information Gathering'
  | 'Qualified'
  | 'Booking Opportunity'
  | 'Booked'
  | 'Customer'
  | 'Follow-Up Pending'
  | 'Escalated'
  | 'Lost';

export type ChannelType = 'web_chat' | 'whatsapp' | 'voice';

export type MessageSender = 'customer' | 'agent' | 'human_owner' | 'system';

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'rescheduled';

export type EscalationStatus = 'pending' | 'resolved';

export type KnowledgeRequestStatus = 'pending' | 'approved' | 'rejected';

export type FollowUpStatus = 'pending' | 'sent' | 'cancelled';

export type FollowUpType = 're_engagement' | 'day_1' | 'day_3' | 'missed_call';
export type FollowUpChannel = 'web_chat' | 'whatsapp' | 'voice' | 'sms';
export type FollowUpTriggerReason = 'inactivity' | 'missed_call' | 'booking_no_show' | 'manual';

export interface FAQ {
  question: string;
  answer: string;
}

export interface EscalationRules {
  autoEscalateKeywords?: string[];
  alertMethods?: ('dashboard' | 'email' | 'sms')[];
  notifyEmail?: string;
  notifyPhone?: string;
  inactivityTimeoutMinutes?: number;
}

export interface WorkingHours {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface RecoveryStep {
  type: FollowUpType;
  delayMinutes?: number;
  delayHours?: number;
  channel: FollowUpChannel;
}

export interface RecoveryConfig {
  inactivityTimeoutMinutes: number;
  sequences: Record<string, RecoveryStep[]>;
}

export interface AppointmentSettings {
  slotDurationMinutes: number;
  workingHours: {
    weekday: WorkingHours | null;
    saturday: WorkingHours | null;
    sunday: WorkingHours | null;
  };
  bufferMinutesBefore?: number;
  bufferMinutesAfter?: number;
  recoveryConfig?: RecoveryConfig;
}

export interface AvailabilitySchedule {
  id: string;
  businessId: string;
  serviceId: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityOverride {
  id: string;
  businessId: string;
  serviceId: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarCredentials {
  id: string;
  businessId: string;
  provider: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
  calendarId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  businessType: string;
  archetype: string;
  faqs: FAQ[];
  escalationRules: EscalationRules;
  appointmentSettings: AppointmentSettings;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  priceMin: number;
  priceMax: number;
  durationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  lifecycleState: CustomerLifecycleState;
  lastInteractionAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerChannel {
  id: string;
  customerId: string;
  channelType: ChannelType;
  channelIdentity: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  customerId: string;
  businessId: string;
  status: 'active' | 'closed';
  channelType: ChannelType;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: MessageSender;
  content: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  businessId: string;
  serviceId: string | null;
  appointmentTime: string;
  status: AppointmentStatus;
  notes?: string;
  cancellationReason?: string;
  rescheduledFromId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Escalation {
  id: string;
  customerId: string;
  businessId: string;
  conversationId: string;
  reason: string;
  status: EscalationStatus;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeRequest {
  id: string;
  businessId: string;
  conversationId: string;
  unansweredQuestion: string;
  suggestedAnswer: string | null;
  status: KnowledgeRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp {
  id: string;
  customerId: string;
  businessId: string;
  type: FollowUpType;
  channel: FollowUpChannel;
  triggerReason: FollowUpTriggerReason;
  attemptNumber: number;
  scheduledAt: string;
  status: FollowUpStatus;
  sentAt: string | null;
  resolvedAt: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
