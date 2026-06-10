export interface HeroContent {
  headline: string;
  subheadline: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
}

export interface ProblemContent {
  headline: string;
  problems: { text: string }[];
  result: string;
}

export interface SolutionItem {
  label: string;
  description: string;
}

export interface SolutionContent {
  headline: string;
  items: SolutionItem[];
}

export interface Step {
  number: number;
  title: string;
  description: string;
}

export interface HowItWorksContent {
  headline: string;
  steps: Step[];
}

export interface ShowcaseItem {
  label: string;
  description: string;
}

export interface ShowcaseContent {
  headline: string;
  items: ShowcaseItem[];
}

export interface Industry {
  name: string;
  description: string;
}

export interface IndustriesContent {
  headline: string;
  industries: Industry[];
}

export interface DemoMessage {
  sender: 'customer' | 'ai';
  text: string;
}

export interface DemoContent {
  headline: string;
  messages: DemoMessage[];
}

export interface FounderContent {
  headline: string;
  name: string;
  title: string;
  story: string;
}

export interface CtaPrimaryAction {
  label: string;
  href: string;
  mailto?: {
    to: string;
    subject: string;
    body: string;
  };
}

export interface CtaContent {
  headline: string;
  subheadline: string;
  primaryCta: CtaPrimaryAction;
  secondaryActions: {
    email: string;
    phone: string;
  };
}

export interface MarketingContent {
  hero: HeroContent;
  problem: ProblemContent;
  solution: SolutionContent;
  howItWorks: HowItWorksContent;
  showcase: ShowcaseContent;
  industries: IndustriesContent;
  demo: DemoContent;
  founder: FounderContent;
  cta: CtaContent;
}

export const defaultContent: MarketingContent = {
  hero: {
    headline: 'Never Miss Another Customer.',
    subheadline:
      'FrontDeskOS acts like a 24/7 AI receptionist that answers questions, captures leads, books appointments, follows up automatically, and escalates urgent issues to your team.',
    primaryCta: { label: 'Book a Demo', href: '#cta' },
    secondaryCta: { label: 'See Live Demo', href: '/brightsmile-dental' },
  },

  problem: {
    headline: 'Most businesses lose customers because:',
    problems: [
      { text: 'Calls go unanswered' },
      { text: 'Messages arrive after hours' },
      { text: 'Staff forget follow-ups' },
      { text: 'Leads slip through the cracks' },
    ],
    result: 'Lost revenue.',
  },

  solution: {
    headline: 'FrontDeskOS handles everything:',
    items: [
      { label: 'Lead Capture', description: 'Every inquiry becomes a tracked lead with full contact details and conversation history.' },
      { label: 'Appointment Booking', description: 'Customers book directly through chat. Calendar syncs automatically.' },
      { label: 'FAQ Responses', description: 'Answers common questions instantly using your business knowledge base.' },
      { label: 'Customer Follow-Ups', description: 'Automated re-engagement for inactive leads and post-appointment check-ins.' },
      { label: 'Escalation Management', description: 'Flags urgent issues — legal threats, complaints, emergencies — for human attention.' },
      { label: 'Customer Tracking', description: 'Full lifecycle view from first inquiry to booked customer.' },
      { label: 'Dashboard Reporting', description: 'See lead volume, conversion rates, escalations, and team performance at a glance.' },
      { label: 'Pilot Program Available', description: 'FrontDeskOS is currently accepting limited pilot partners. Get priority support and shape the product roadmap.' },
    ],
  },

  howItWorks: {
    headline: 'How It Works',
    steps: [
      { number: 1, title: 'Customer visits your website', description: 'The chat widget appears and greets them instantly.' },
      { number: 2, title: 'AI receptionist answers questions', description: 'Answers FAQs, discusses services, and handles objections naturally.' },
      { number: 3, title: 'AI captures lead information', description: 'Name, email, phone, and intent are recorded automatically.' },
      { number: 4, title: 'Appointment gets booked', description: 'Customer picks a time slot. Calendar is updated. Confirmation sent.' },
      { number: 5, title: 'Business sees everything in dashboard', description: 'Full lead profile, conversation history, and lifecycle tracking.' },
    ],
  },

  showcase: {
    headline: 'Everything you need to run your front desk.',
    items: [
      { label: 'Chat Widget', description: 'Embeddable widget that handles inquiries 24/7.' },
      { label: 'Customer Dashboard', description: 'Full lead profiles with lifecycle tracking.' },
      { label: 'Appointments', description: 'All bookings in one place with status management.' },
      { label: 'Escalations', description: 'Urgent issues flagged for immediate attention.' },
      { label: 'Follow-Ups', description: 'Automated re-engagement campaigns.' },
    ],
  },

  industries: {
    headline: 'Built for service businesses.',
    industries: [
      { name: 'Dental Clinics', description: 'Handle new patient inquiries, insurance questions, and booking.' },
      { name: 'Salons', description: 'Capture walk-in traffic and convert to appointments.' },
      { name: 'Gyms', description: 'Answer membership questions and schedule tours.' },
      { name: 'Spas', description: 'Handle service inquiries and booking preferences.' },
      { name: 'Wellness Clinics', description: 'Manage patient intake and follow-up care.' },
      { name: 'Service Businesses', description: 'Any business that needs 24/7 front desk coverage.' },
    ],
  },

  demo: {
    headline: 'See it in action.',
    messages: [
      { sender: 'customer', text: 'How much is teeth whitening?' },
      { sender: 'ai', text: 'Our whitening treatments range from $350–$600. Would you like to schedule a consultation?' },
      { sender: 'customer', text: 'Yes, do you have anything this week?' },
      { sender: 'ai', text: 'We have Thursday at 2pm or Friday at 10am. Which works best for you?' },
      { sender: 'customer', text: 'Friday at 10am works.' },
      { sender: 'ai', text: "Great! I've booked you for Friday at 10am. You'll receive a confirmation via text. See you soon!" },
    ],
  },

  founder: {
    headline: "Built by someone who's been there.",
    name: 'Shashwat Sinha',
    title: 'Founder & CEO',
    story:
      "I built FrontDeskOS because I watched local businesses lose customers every single day — not because their service was bad, but because nobody answered the phone after hours. A missed call is a lost customer. A slow response is a lost lead. FrontDeskOS fixes that. It's the front desk that never sleeps, never forgets, and never puts a customer on hold.",
  },

  cta: {
    headline: 'Stop Losing Customers After Hours.',
    subheadline:
      'FrontDeskOS acts as your 24/7 AI receptionist — answering questions, capturing leads, booking appointments, following up automatically, and escalating urgent issues to your team.\n\nWhile your staff focuses on serving customers, FrontDeskOS makes sure no inquiry gets missed.',
    primaryCta: {
      label: 'Book a Demo',
      href: 'https://calendly.com/sinhashashwat21/30min',
    },
    secondaryActions: {
      email: 'sinhashashwat21@gmail.com',
      phone: '+91 63072 34110',
    },
  },
};
