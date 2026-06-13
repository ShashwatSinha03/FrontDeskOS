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
    headline: 'How Many Customers Did You Miss Today?',
    subheadline:
      'Nuvora handles enquiries, bookings, follow-ups, and customer questions 24/7 so opportunities don not disappear between business hours.',
    primaryCta: { label: 'Book a Demo', href: '#cta' },
    secondaryCta: { label: 'See It Live', href: '/brightsmile-dental' },
  },

  problem: {
    headline: 'Customers do not disappear by accident.',
    problems: [
      { text: 'Inconsistent follow-ups' },
      { text: 'Manual processes' },
      { text: 'Inconsistent follow-ups' },
      { text: 'Leads slip through the cracks' },
    ],
    result: 'Opportunities become losses.',
  },

  solution: {
    headline: 'The work nobody has time for. Done automatically.',
    items: [
      { label: 'Lead Capture', description: 'No more forgotten messages, lost calls, or missing contact details.' },
      { label: 'Appointment Booking', description: 'Customers schedule instantly without waiting for a callback.' },
      { label: 'FAQ Responses', description: 'Pricing, services, availability, directions—handled instantly.' },
      { label: 'Customer Follow-Ups', description: 'Every lead gets consistent follow-ups until they are ready to buy.' },
      { label: 'Escalation Management', description: 'Critical issues are escalated immediately.' },
      { label: 'Customer Tracking', description: 'From first enquiry to a booking customer.' },
      { label: 'Dashboard Reporting', description: 'See every lead and customer in one place.' },
      { label: 'Pilot Program Available', description: 'Currently accepting limited pilot partners. Get priority support and shape the product roadmap.' },
    ],
  },

  howItWorks: {
    headline: 'From enquiry to customer. Without manual follow-ups.',
    steps: [
      { number: 1, title: 'They get an answer immediately.', description: 'No waiting for business hours. No waiting for callbacks.' },
      { number: 2, title: 'Their questions get handled.', description: 'Services, pricing, availability, FAQs—all covered automatically.' },
      { number: 3, title: 'Their interest gets captured.', description: 'Contact details, intent, and conversation history are recorded.' },
      { number: 4, title: 'They take the next step', description: 'Appointments, consultations, or bookings happen instantly.' },
      { number: 5, title: 'Nothing falls through the cracks.', description: 'You see everything in one place' },
    ],
  },

  showcase: {
    headline: 'Built for the conversations that drive revenue.',
    items: [
      { label: 'Conversations', description: 'Manage enquiries from the first message onward.' },
      { label: 'Customers', description: 'Track relationships, not spreadsheets.' },
      { label: 'Bookings', description: 'Keep schedules organized automatically.' },
      { label: 'Escalations', description: 'Handle critical situations before they become problems.' },
      { label: 'Follow-Ups', description: 'Stay top-of-mind automatically.' },
    ],
  },

  industries: {
    headline: 'Built for service businesses.',
    industries: [
      { name: 'Dental Clinics', description: 'Patients want answers before they book.' },
      { name: 'Salons', description: 'Customers expect instant scheduling.' },
      { name: 'Gyms', description: 'Prospects compare multiple options quickly.' },
      { name: 'Spas', description: 'Experience starts before the appointment.' },
      { name: 'Wellness Clinics', description: 'Consistent follow-up matters.' },
      { name: 'Service Businesses', description: 'Every enquiry is a potential customer.' },
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
    headline: "Good businesses lose customers every day.",
    name: 'Shashwat Sinha',
    title: 'Founder & CEO',
    story:
      "The issue was never a lack of demand. Customers were already reaching out. The problem was what happened next. Missed calls. Delayed responses. Forgotten follow ups. Good businesses were losing customers they never even knew they had. Nuvora exists to close that gap. So every conversation gets answered, every lead gets tracked, and every opportunity has a chance to become revenue.",
  },

  cta: {
    headline: 'Stop Losing Customers After Hours.',
    subheadline:
    'The phone does not stop ringing when the workday ends. Messages keep coming. Questions keep coming. Opportunities keep coming. Nuvora makes sure they do not go unanswered.',
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
