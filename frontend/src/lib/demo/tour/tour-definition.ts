import type { DemoEventMap } from '../engine/demo-event-bus';

export interface TourStepCTA {
  label: string;
  href?: string;
  onClick?: () => void;
  secondary?: { label: string; href?: string; onClick?: () => void };
}

export interface TourStep {
  id: string;
  order: number;
  page: string;
  title: string;
  description: string;
  target?: string;
  nextStep?: string;
  previousStep?: string;
  cta?: TourStepCTA;
  autoAdvance?: boolean;
  optional?: boolean;
  type: 'modal' | 'toast' | 'tooltip' | 'spotlight';
  unlockEvent?: keyof DemoEventMap;
}

export const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    order: 1,
    page: '/demo/apex-dental',
    title: 'Welcome to Novura',
    description:
      'Novura is an AI receptionist that handles your customer conversations, appointments, and escalations — so your team can focus on what matters.',
    target: 'tour-chat-widget',
    type: 'tooltip',
    cta: { label: 'Start Customer Journey' },
  },
  {
    id: 'book-appointment',
    order: 2,
    page: '/demo/apex-dental',
    title: 'Book an Appointment',
    description:
      'Click "Book an Appointment" in the chat to see how Novura handles a real booking flow.',
    target: 'tour-chat-widget',
    type: 'tooltip',
    nextStep: 'booking-complete',
    autoAdvance: true,
  },
  {
    id: 'booking-complete',
    order: 3,
    page: '/demo/apex-dental',
    title: 'Booking Completed',
    description:
      'While your customer sees a friendly confirmation, your staff immediately receives the booking across all your dashboards.',
    type: 'modal',
    unlockEvent: 'appointment_created',
    cta: { label: 'Open Dashboard', href: '/demo/dashboard' },
  },
  {
    id: 'dashboard-overview',
    order: 4,
    page: '/demo/dashboard',
    title: 'Dashboard Overview',
    description:
      'Your dashboard updates in real time. Appointments, leads, and notifications all reflect the new booking instantly.',
    target: 'tour-dashboard-metrics',
    type: 'spotlight',
    cta: { label: 'Open Conversation', href: '/demo/inbox' },
  },
  {
    id: 'human-escalation',
    order: 5,
    page: '/demo/inbox',
    title: 'Human Escalation',
    description:
      'When a customer requests a human, Novura notifies your team and the conversation appears in your inbox with an escalation badge.',
    target: 'tour-inbox-escalation',
    type: 'spotlight',
    cta: { label: 'View Escalation', href: '/demo/inbox/conv-mike' },
  },
  {
    id: 'inbox-handoff',
    order: 6,
    page: '/demo/inbox/conv-mike',
    title: 'Seamless Handoff',
    description:
      'Your team can join, take over, and return the conversation to the AI — all without losing context. Customers never repeat themselves.',
    target: 'tour-return-to-ai',
    type: 'tooltip',
    cta: { label: 'Continue', href: '/demo/dashboard/analytics' },
  },
  {
    id: 'business-intelligence',
    order: 7,
    page: '/demo/dashboard/analytics',
    title: 'Business Intelligence',
    description:
      'From conversation volume to cost per channel, Novura gives you full visibility into your operations. Analytics, costs, and performance — all in one place.',
    type: 'modal',
    cta: { label: 'See How Novura Fits Your Business' },
    nextStep: 'completion',
  },
];

export const completionStep: TourStep = {
  id: 'completion',
  order: 8,
  page: '',
  title: 'You\'ve Experienced the Complete Journey',
  description:
    'From a customer\'s first message to business insights — Novura manages it all. Ready to see how it works for your business?',
  type: 'modal',
  cta: {
    label: 'Book a Discovery Call',
    href: 'https://calendly.com/sinhashashwat21/30min',
    secondary: { label: 'Explore Freely', href: '/demo/apex-dental' },
  },
};
