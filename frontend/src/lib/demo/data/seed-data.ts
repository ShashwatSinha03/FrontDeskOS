import type { Conversation, Appointment, Notification } from '../engine/types';
import { AppointmentStore } from '../stores/appointment-store';
import { ConversationStore } from '../stores/conversation-store';
import { NotificationStore } from '../stores/notification-store';
import { AnalyticsStore } from '../stores/analytics-store';
import { CostStore } from '../stores/cost-store';
import { DashboardStore } from '../stores/dashboard-store';

export function seedDemoData(
  appointments: AppointmentStore,
  conversations: ConversationStore,
  notifications: NotificationStore,
  analytics: AnalyticsStore,
  costs: CostStore,
  dashboard: DashboardStore,
): void {
  conversations.conversations.push(...getSeedConversations());
  appointments.seed(getSeedAppointments());
  notifications.notifications.push(...getSeedNotifications());
}

export function getSeedConversations(): Conversation[] {
  const now = Date.now();
  return [
    {
      id: 'conv-sarah',
      customerName: 'Sarah Johnson',
      customerPhone: '+1 (555) 123-4567',
      status: 'active',
      unread: 2,
      channel: 'whatsapp',
      createdAt: now - 1800000,
      messages: [
        { id: 'm1', role: 'customer', content: 'Hi! Do you have availability for a cleaning this week?', timestamp: now - 1800000 },
        { id: 'm2', role: 'ai', content: "Hello Sarah! Yes, we have availability this week. We offer routine cleaning on Thursday at 2pm or Friday at 10am. Which works best for you?", timestamp: now - 1750000 },
        { id: 'm3', role: 'customer', content: 'Friday at 10am sounds perfect!', timestamp: now - 600000 },
        { id: 'm4', role: 'ai', content: "Great! I've noted Friday at 10am for a routine cleaning. I'll send you a confirmation shortly. Is there anything else I can help you with?", timestamp: now - 550000 },
      ],
    },
    {
      id: 'conv-mike',
      customerName: 'Mike Chen',
      customerPhone: '+1 (555) 987-6543',
      status: 'escalated',
      unread: 3,
      channel: 'web',
      escalatedAt: now - 120000,
      createdAt: now - 3600000,
      messages: [
        { id: 'm5', role: 'customer', content: 'I need to talk to the doctor about a sensitive issue.', timestamp: now - 3600000 },
        { id: 'm6', role: 'ai', content: "I understand you'd like to speak with a doctor. Let me transfer you to our team who can help with your request.", timestamp: now - 3550000 },
        { id: 'm7', role: 'customer', content: 'This is really important, I need to speak to someone now.', timestamp: now - 120000 },
      ],
    },
    {
      id: 'conv-emily',
      customerName: 'Emily Rodriguez',
      customerPhone: '+1 (555) 456-7890',
      status: 'resolved',
      unread: 0,
      channel: 'sms',
      createdAt: now - 86400000,
      messages: [
        { id: 'm8', role: 'customer', content: 'Thank you for the appointment reminder!', timestamp: now - 86400000 },
        { id: 'm9', role: 'ai', content: "You're welcome, Emily! We look forward to seeing you tomorrow at 2pm for your teeth whitening appointment.", timestamp: now - 86300000 },
      ],
    },
    {
      id: 'conv-david',
      customerName: 'David Kim',
      customerPhone: '+1 (555) 234-5678',
      status: 'active',
      unread: 1,
      channel: 'whatsapp',
      createdAt: now - 7200000,
      messages: [
        { id: 'm10', role: 'customer', content: "What's the cost of a dental implant?", timestamp: now - 7200000 },
        { id: 'm11', role: 'ai', content: "Great question! Our dental implants start at $3,500 per tooth. This includes the consultation, implant placement, and crown. Would you like to schedule a consultation to discuss your specific needs?", timestamp: now - 7150000 },
        { id: 'm12', role: 'customer', content: 'That sounds reasonable. Do you offer payment plans?', timestamp: now - 300000 },
      ],
    },
  ];
}

export function getSeedAppointments(): Appointment[] {
  const now = Date.now();
  return [
    { id: 'apt-1', service: 'Teeth Whitening', date: '2026-06-25', time: '10:00 AM', customerName: 'Emily Rodriguez', status: 'completed', createdAt: now - 172800000 },
    { id: 'apt-2', service: 'Routine Cleaning', date: '2026-06-26', time: '2:00 PM', customerName: 'James Wilson', status: 'completed', createdAt: now - 86400000 },
    { id: 'apt-3', service: 'Dental Checkup', date: '2026-06-27', time: '9:00 AM', customerName: 'Lisa Thompson', status: 'confirmed', createdAt: now - 43200000 },
    { id: 'apt-4', service: 'Fillings', date: '2026-06-28', time: '11:00 AM', customerName: 'Robert Garcia', status: 'confirmed', createdAt: now - 21600000 },
  ];
}

export function getSeedNotifications(): Notification[] {
  const now = Date.now();
  return [
    { id: 'notif-1', type: 'appointment', title: 'Appointment Completed', message: 'Emily Rodriguez completed teeth whitening', read: true, createdAt: now - 172800000 },
    { id: 'notif-2', type: 'lead', title: 'New Lead Captured', message: 'David Kim — WhatsApp', read: true, createdAt: now - 7200000 },
    { id: 'notif-3', type: 'escalation', title: 'Escalation Waiting', message: 'Mike Chen requested human assistance — 2 min ago', read: false, createdAt: now - 120000 },
  ];
}
