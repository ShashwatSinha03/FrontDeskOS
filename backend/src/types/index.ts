// Nevura TypeScript Types & Interfaces

// ==========================================
// Enums
// ==========================================

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

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';

export type EscalationStatus = 'pending' | 'resolved';

export type KnowledgeRequestStatus = 'pending' | 'approved' | 'rejected';

export type FollowUpStatus = 'pending' | 'sent' | 'cancelled';

export type FollowUpType = 're_engagement' | 'day_1' | 'day_3' | 'missed_call';
export type FollowUpChannel = 'web_chat' | 'whatsapp' | 'voice' | 'sms';
export type FollowUpTriggerReason = 'inactivity' | 'missed_call' | 'booking_no_show' | 'manual';

// ==========================================
// Sub-types & Configuration Schemas
// ==========================================

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

export interface RecoveryChannel {
  name: string;
  send(params: {
    businessId: string;
    customerId: string;
    conversationId?: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<{ sent: boolean; externalId?: string }>;
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
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailabilityOverride {
  id: string;
  businessId: string;
  serviceId: string | null;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarCredentials {
  id: string;
  businessId: string;
  provider: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  calendarId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// Domain Entities
// ==========================================

export interface Business {
  id: string; // UUID
  name: string;
  slug: string;
  businessType: string; // e.g. 'dental', 'salon'
  archetype: string;     // e.g. 'solo_practitioner'
  phone?: string;
  email?: string;
  address?: string;
  description?: string;
  logoUrl?: string;
  timezone: string;
  status: 'active' | 'disabled';
  faqs: FAQ[];
  escalationRules: EscalationRules;
  appointmentSettings: AppointmentSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerSession {
  id: string;
  sessionId: string;
  customerId: string | null;
  businessId: string;
  lastActiveAt: Date;
  createdAt: Date;
}

export interface Service {
  id: string; // UUID
  businessId: string; // UUID
  name: string;
  description?: string;
  priceMin: number;
  priceMax: number;
  durationMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string; // UUID
  businessId: string; // UUID
  name: string | null;
  email: string | null;
  phone: string | null;
  lifecycleState: CustomerLifecycleState;
  lastInteractionAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerChannel {
  id: string; // UUID
  customerId: string; // UUID
  channelType: ChannelType;
  channelIdentity: string; // Web session ID, Phone number, WhatsApp JID
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string; // UUID
  customerId: string; // UUID
  businessId: string; // UUID
  status: 'active' | 'closed';
  channelType: ChannelType;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string; // UUID
  conversationId: string; // UUID
  sender: MessageSender;
  content: string;
  metadata: Record<string, any>; // workflow routing, context parameters, internal debug notes
  createdAt: Date;
}

export interface Appointment {
  id: string; // UUID
  customerId: string; // UUID
  businessId: string; // UUID
  serviceId: string | null; // UUID
  appointmentTime: Date;
  status: AppointmentStatus;
  notes?: string;
  cancellationReason?: string;
  rescheduledFromId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Escalation {
  id: string; // UUID
  customerId: string; // UUID
  businessId: string; // UUID
  conversationId: string; // UUID
  reason: string;
  status: EscalationStatus;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeRequest {
  id: string; // UUID
  businessId: string; // UUID
  conversationId: string; // UUID
  unansweredQuestion: string;
  suggestedAnswer: string | null;
  status: KnowledgeRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowUp {
  id: string;
  customerId: string;
  businessId: string;
  type: FollowUpType;
  channel: FollowUpChannel;
  triggerReason: FollowUpTriggerReason;
  attemptNumber: number;
  scheduledAt: Date;
  status: FollowUpStatus;
  sentAt: Date | null;
  resolvedAt: Date | null;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// Agent Types
// ==========================================

/** All intents the Conversation Agent can classify and route. */
export type ConversationIntent =
  | 'greeting'
  | 'information'
  | 'pricing'
  | 'booking'
  | 'reschedule'
  | 'cancellation'
  | 'lead_capture'
  | 'escalation'
  | 'human_request'
  | 'unknown';

/**
 * Structured result returned by the LangGraph agent after processing a message.
 * Consumed by ChatService to persist the reply and apply side-effects.
 */
export interface AgentResult {
  /** The reply text to send back to the customer. */
  reply: string;
  /** Classified intent of the customer's message. */
  intent: ConversationIntent;
  /** Any updated lifecycle state to persist. */
  updatedLifecycleState?: CustomerLifecycleState;
  /** Set if the agent created a new escalation record. */
  escalationId?: string;
  /** Set if the agent created a new appointment. */
  appointmentId?: string;
  /** Set if the agent could not answer and logged a knowledge request. */
  knowledgeRequestId?: string;
  /** Internal metadata for observability and debugging. */
  metadata: Record<string, any>;
}

