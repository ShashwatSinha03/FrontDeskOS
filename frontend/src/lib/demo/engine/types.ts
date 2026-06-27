export type ScenarioId = 'greeting' | 'booking' | 'pricing' | 'escalation' | 'faq' | 'fallback';

export type MessageRole = 'customer' | 'ai' | 'human';

export interface DemoMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

export interface ScenarioNode {
  id: string;
  aiMessage: string;
  typingDelay?: number;
  quickReplies?: string[];
  transitions?: Record<string, string>;
  effects?: DemoEffect[];
}

export interface DemoEffect {
  type: 'appointment_created' | 'lead_captured' | 'escalation_created' | 'conversation_updated' | 'message_sent';
  payload: Record<string, unknown>;
}

export interface Scenario {
  id: ScenarioId;
  name: string;
  triggerKeywords: string[];
  nodes: Record<string, ScenarioNode>;
  entryNodeId: string;
}

export interface Appointment {
  id: string;
  service: string;
  date: string;
  time: string;
  customerName: string;
  status: 'confirmed' | 'completed' | 'cancelled';
  createdAt: number;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  source: string;
  status: 'new' | 'contacted' | 'booked' | 'lost';
  createdAt: number;
}

export interface Escalation {
  id: string;
  conversationId: string;
  reason: string;
  status: 'pending' | 'active' | 'resolved';
  createdAt: number;
}

export interface Conversation {
  id: string;
  customerName: string;
  customerPhone: string;
  status: 'active' | 'pending' | 'escalated' | 'resolved';
  messages: DemoMessage[];
  unread: number;
  escalatedAt?: number;
  channel: 'whatsapp' | 'web' | 'sms';
  createdAt: number;
}

export interface Notification {
  id: string;
  type: 'escalation' | 'appointment' | 'lead' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: number;
}

export interface CostEntry {
  id: string;
  category: 'llm' | 'whatsapp' | 'sms' | 'channel';
  description: string;
  amount: number;
  date: string;
}

export interface DashboardMetrics {
  totalConversations: number;
  activeConversations: number;
  totalAppointments: number;
  totalLeads: number;
  escalationsPending: number;
  responseTime: number;
  satisfactionRate: number;
}

export interface AnalyticsData {
  conversationVolume: { date: string; count: number }[];
  leadConversion: { date: string; leads: number; bookings: number }[];
  appointmentsByService: { service: string; count: number }[];
  responseTimes: { date: string; avgSeconds: number }[];
  satisfactionByDay: { date: string; rate: number }[];
}
