import type { DemoEventMap } from '../engine/demo-event-bus';

export interface TourStep {
  id: string;
  triggerEvent: keyof DemoEventMap;
  title: string;
  description: string;
  action?: { label: string; href: string };
  type: 'toast' | 'modal';
}

export const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    triggerEvent: 'demo_started',
    title: 'Welcome to Novura',
    description: 'Try booking an appointment to see how the AI receptionist works. Click the chat bubble in the bottom-right corner.',
    type: 'modal',
    action: { label: 'Open Chat', href: '/demo/apex-dental' },
  },
  {
    id: 'appointment_booked',
    triggerEvent: 'appointment_created',
    title: 'Appointment Booked!',
    description: 'Your appointment was created instantly. Now let\'s see how the owner receives it.',
    type: 'modal',
    action: { label: 'Open Dashboard', href: '/demo/dashboard' },
  },
  {
    id: 'escalation_triggered',
    triggerEvent: 'escalation_created',
    title: 'Human Escalation',
    description: 'When a customer needs human assistance, it appears in the inbox as an escalation.',
    type: 'modal',
    action: { label: 'Open Inbox', href: '/demo/inbox' },
  },
  {
    id: 'lead_captured_toast',
    triggerEvent: 'lead_captured',
    title: 'New Lead Captured',
    description: 'A new lead has been captured and added to your dashboard.',
    type: 'toast',
  },
];
