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

export const templates: Record<string, IndustryTemplate> = {
  gym: {
    version: '1.0.0',
    industry: 'gym',
    label: 'Gym & Fitness',
    suggestedServices: [
      { name: 'Personal Training', description: 'One-on-one session with a certified personal trainer', durationMinutes: 60, price: 1500, category: 'Training' },
      { name: 'Group Class', description: 'HIIT, CrossFit, Zumba, or Spin class', durationMinutes: 45, price: 500, category: 'Classes' },
      { name: 'Yoga Session', description: 'Hatha and Vinyasa flow yoga', durationMinutes: 60, price: 400, category: 'Wellness' },
      { name: 'Nutrition Counseling', description: 'Personalized diet and nutrition plan', durationMinutes: 45, price: 2000, category: 'Wellness' },
      { name: 'Free Trial Session', description: 'Try before you commit — first session on us', durationMinutes: 30, price: 0, category: 'Membership' },
    ],
    suggestedFaqs: [
      { question: 'What are your opening hours?', answer: '', category: 'General' },
      { question: 'How much does a membership cost?', answer: '', category: 'Pricing' },
      { question: 'Do you offer free trials?', answer: 'Yes, we offer a free trial session. You can book it through our website.', category: 'Membership' },
      { question: 'What should I bring to my first session?', answer: 'Comfortable workout clothes, a water bottle, and a towel.', category: 'General' },
      { question: 'Do you have parking?', answer: '', category: 'General' },
      { question: 'What types of classes do you offer?', answer: '', category: 'Classes' },
      { question: 'Are your trainers certified?', answer: 'Yes, all our trainers are certified professionals.', category: 'Training' },
      { question: 'Can I cancel or reschedule a booking?', answer: 'Free cancellation up to 2 hours before your session.', category: 'Policies' },
      { question: 'What payment methods do you accept?', answer: 'Cash, UPI, credit/debit cards, and all major wallets.', category: 'Billing' },
      { question: 'Do you have shower facilities?', answer: '', category: 'General' },
    ],
    defaultHours: [
      { dayOfWeek: 0, openTime: '08:00', closeTime: '18:00', isClosed: false },
      { dayOfWeek: 1, openTime: '05:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 2, openTime: '05:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 3, openTime: '05:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 4, openTime: '05:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 5, openTime: '06:00', closeTime: '21:00', isClosed: false },
      { dayOfWeek: 6, openTime: '07:00', closeTime: '20:00', isClosed: false },
    ],
    suggestedGreeting: 'Welcome! Ready to crush your fitness goals? I can help with memberships, class schedules, personal training, and booking. How can I help you today?',
    escalationRules: {
      autoEscalateKeywords: ['emergency', 'injury', 'refund', 'complaint', 'manager'],
      alertMethods: ['dashboard'],
      notifyEmail: '',
      inactivityTimeoutMinutes: 10,
    },
    slotDurationMinutes: 30,
  },

  salon: {
    version: '1.0.0',
    industry: 'salon',
    label: 'Salon & Beauty',
    suggestedServices: [
      { name: 'Haircut & Style', description: 'Wash, cut, and blow-dry by our expert stylists', durationMinutes: 45, price: 599, category: 'Hair' },
      { name: 'Hair Coloring', description: 'Full-head professional hair coloring with premium products', durationMinutes: 120, price: 2499, category: 'Hair' },
      { name: 'Facial Treatment', description: 'Deep-cleansing facial with organic products', durationMinutes: 60, price: 1299, category: 'Skincare' },
      { name: 'Manicure & Pedicure', description: 'Nail care with massage and premium polish', durationMinutes: 75, price: 999, category: 'Nails' },
      { name: 'Bridal Makeup', description: 'Complete bridal makeup package with trial session', durationMinutes: 180, price: 5999, category: 'Makeup' },
    ],
    suggestedFaqs: [
      { question: 'What are your opening hours?', answer: '', category: 'General' },
      { question: 'Do I need to book in advance?', answer: 'Walk-ins welcome, but we recommend booking for guaranteed slots, especially on weekends.', category: 'Booking' },
      { question: 'What payment methods do you accept?', answer: 'Cash, UPI, credit/debit cards, and all major wallets.', category: 'Billing' },
      { question: 'How long does a haircut take?', answer: 'A standard haircut takes about 45 minutes including wash and styling.', category: 'Services' },
      { question: 'Do you offer home services?', answer: 'Currently we serve only at our salon location.', category: 'Services' },
      { question: 'Can I cancel or reschedule?', answer: 'Free cancellation up to 2 hours before your appointment.', category: 'Policies' },
      { question: 'What brands do you use?', answer: 'We use professional brands including Schwarzkopf, L\'Oreal Professional, and OPI.', category: 'Products' },
      { question: 'Do you offer gift vouchers?', answer: 'Yes, gift vouchers available in various denominations.', category: 'Billing' },
      { question: 'Do you have parking?', answer: '', category: 'General' },
      { question: 'What is your cancellation policy?', answer: 'Cancel 2+ hours before for free. Late cancellations may incur a 50% charge.', category: 'Policies' },
    ],
    defaultHours: [
      { dayOfWeek: 0, openTime: '10:00', closeTime: '18:00', isClosed: false },
      { dayOfWeek: 1, openTime: '09:00', closeTime: '20:00', isClosed: false },
      { dayOfWeek: 2, openTime: '09:00', closeTime: '20:00', isClosed: false },
      { dayOfWeek: 3, openTime: '09:00', closeTime: '20:00', isClosed: false },
      { dayOfWeek: 4, openTime: '09:00', closeTime: '20:00', isClosed: false },
      { dayOfWeek: 5, openTime: '09:00', closeTime: '21:00', isClosed: false },
      { dayOfWeek: 6, openTime: '09:00', closeTime: '21:00', isClosed: false },
    ],
    suggestedGreeting: 'Hi there! Welcome to our salon. I can help you with service bookings, pricing, and more. What can I do for you today?',
    escalationRules: {
      autoEscalateKeywords: ['complaint', 'refund', 'manager', 'damage', 'allergic'],
      alertMethods: ['dashboard'],
      notifyEmail: '',
      inactivityTimeoutMinutes: 10,
    },
    slotDurationMinutes: 30,
  },

  spa: {
    version: '1.0.0',
    industry: 'spa',
    label: 'Spa & Wellness',
    suggestedServices: [
      { name: 'Swedish Massage', description: 'Full-body relaxing massage with aromatic oils', durationMinutes: 60, price: 1999, category: 'Massage' },
      { name: 'Deep Tissue Massage', description: 'Therapeutic massage targeting muscle tension', durationMinutes: 60, price: 2499, category: 'Massage' },
      { name: 'Aromatherapy Facial', description: 'Rejuvenating facial with essential oils', durationMinutes: 60, price: 1799, category: 'Facial' },
      { name: 'Body Scrub & Wrap', description: 'Exfoliating scrub followed by a nourishing body wrap', durationMinutes: 90, price: 2999, category: 'Body' },
      { name: 'Couple\'s Massage', description: 'Side-by-side massage for two', durationMinutes: 60, price: 3999, category: 'Massage' },
    ],
    suggestedFaqs: [
      { question: 'What are your opening hours?', answer: '', category: 'General' },
      { question: 'What should I wear for a massage?', answer: 'We provide robes and disposable underwear. You can undress to your comfort level.', category: 'Services' },
      { question: 'Do I need to book in advance?', answer: 'We recommend booking at least 24 hours in advance.', category: 'Booking' },
      { question: 'What payment methods do you accept?', answer: 'Cash, UPI, credit/debit cards, and all major wallets.', category: 'Billing' },
      { question: 'Do you offer gift certificates?', answer: 'Yes, gift certificates available in any denomination.', category: 'Billing' },
      { question: 'Can I cancel or reschedule?', answer: 'Free cancellation up to 4 hours before your appointment.', category: 'Policies' },
      { question: 'Do you have parking?', answer: '', category: 'General' },
      { question: 'Are your therapists certified?', answer: 'All our therapists are certified and experienced professionals.', category: 'Services' },
      { question: 'What is the difference between Swedish and Deep Tissue?', answer: 'Swedish is gentle and relaxing. Deep Tissue targets deeper muscle layers for tension relief.', category: 'Services' },
      { question: 'Do you have couples treatment rooms?', answer: '', category: 'General' },
    ],
    defaultHours: [
      { dayOfWeek: 0, openTime: '10:00', closeTime: '18:00', isClosed: false },
      { dayOfWeek: 1, openTime: '09:00', closeTime: '20:00', isClosed: false },
      { dayOfWeek: 2, openTime: '09:00', closeTime: '20:00', isClosed: false },
      { dayOfWeek: 3, openTime: '09:00', closeTime: '20:00', isClosed: false },
      { dayOfWeek: 4, openTime: '09:00', closeTime: '20:00', isClosed: false },
      { dayOfWeek: 5, openTime: '09:00', closeTime: '21:00', isClosed: false },
      { dayOfWeek: 6, openTime: '09:00', closeTime: '21:00', isClosed: false },
    ],
    suggestedGreeting: 'Welcome to our spa. Looking to relax and rejuvenate? I can help you with massage bookings, spa packages, and any questions about our treatments.',
    escalationRules: {
      autoEscalateKeywords: ['complaint', 'refund', 'manager', 'allergic', 'reaction', 'injury'],
      alertMethods: ['dashboard'],
      notifyEmail: '',
      inactivityTimeoutMinutes: 10,
    },
    slotDurationMinutes: 60,
  },

  dental: {
    version: '1.0.0',
    industry: 'dental',
    label: 'Dental Clinic',
    suggestedServices: [
      { name: 'Dental Checkup', description: 'Comprehensive oral examination and cleaning', durationMinutes: 45, price: 500, category: 'General' },
      { name: 'Teeth Whitening', description: 'Professional teeth whitening treatment', durationMinutes: 60, price: 5000, category: 'Cosmetic' },
      { name: 'Root Canal Treatment', description: 'Endodontic treatment for infected tooth', durationMinutes: 90, price: 5000, category: 'General' },
      { name: 'Dental Filling', description: 'Cavity filling with composite material', durationMinutes: 45, price: 1500, category: 'General' },
      { name: 'Scaling & Polishing', description: 'Professional deep cleaning and polishing', durationMinutes: 45, price: 1000, category: 'General' },
    ],
    suggestedFaqs: [
      { question: 'What are your opening hours?', answer: '', category: 'General' },
      { question: 'Do you accept insurance?', answer: '', category: 'Insurance' },
      { question: 'How often should I visit the dentist?', answer: 'We recommend a checkup every 6 months.', category: 'General' },
      { question: 'Is teeth whitening painful?', answer: 'Most patients experience no pain. Some may have mild sensitivity for 24 hours.', category: 'Services' },
      { question: 'What payment methods do you accept?', answer: 'Cash, UPI, credit/debit cards, and all major insurance plans.', category: 'Billing' },
      { question: 'Do you handle dental emergencies?', answer: 'Yes, we prioritize emergency cases. Please call us immediately for urgent dental issues.', category: 'Emergency' },
      { question: 'Can I cancel or reschedule?', answer: 'Free cancellation up to 4 hours before your appointment.', category: 'Policies' },
      { question: 'Do you have parking?', answer: '', category: 'General' },
      { question: 'What if I have dental anxiety?', answer: 'We offer a comfortable, pressure-free environment. Let us know and we can accommodate you.', category: 'General' },
      { question: 'Do you treat children?', answer: '', category: 'General' },
    ],
    defaultHours: [
      { dayOfWeek: 0, openTime: '09:00', closeTime: '14:00', isClosed: true },
      { dayOfWeek: 1, openTime: '09:00', closeTime: '18:00', isClosed: false },
      { dayOfWeek: 2, openTime: '09:00', closeTime: '18:00', isClosed: false },
      { dayOfWeek: 3, openTime: '09:00', closeTime: '18:00', isClosed: false },
      { dayOfWeek: 4, openTime: '09:00', closeTime: '18:00', isClosed: false },
      { dayOfWeek: 5, openTime: '09:00', closeTime: '17:00', isClosed: false },
      { dayOfWeek: 6, openTime: '09:00', closeTime: '13:00', isClosed: false },
    ],
    suggestedGreeting: 'Welcome to our dental clinic. I can help you with appointment scheduling, treatment information, insurance questions, and more. How can I assist you?',
    escalationRules: {
      autoEscalateKeywords: ['pain', 'emergency', 'bleeding', 'swelling', 'infection', 'refund', 'complaint'],
      alertMethods: ['dashboard', 'email'],
      notifyEmail: '',
      inactivityTimeoutMinutes: 5,
    },
    slotDurationMinutes: 30,
  },

  professional_services: {
    version: '1.0.0',
    industry: 'professional_services',
    label: 'Professional Services',
    suggestedServices: [
      { name: 'Consultation', description: 'Initial consultation to understand your needs', durationMinutes: 60, price: 1000, category: 'Consulting' },
      { name: 'Follow-up Session', description: 'Follow-up appointment to review progress', durationMinutes: 45, price: 750, category: 'Consulting' },
    ],
    suggestedFaqs: [
      { question: 'What are your opening hours?', answer: '', category: 'General' },
      { question: 'How do I book an appointment?', answer: 'You can book directly through our website using the booking form.', category: 'Booking' },
      { question: 'What payment methods do you accept?', answer: 'Cash, UPI, and bank transfer.', category: 'Billing' },
      { question: 'Can I cancel or reschedule?', answer: 'Free cancellation up to 24 hours before your appointment.', category: 'Policies' },
      { question: 'Do you offer online consultations?', answer: '', category: 'Services' },
    ],
    defaultHours: [
      { dayOfWeek: 0, openTime: '10:00', closeTime: '16:00', isClosed: true },
      { dayOfWeek: 1, openTime: '09:00', closeTime: '18:00', isClosed: false },
      { dayOfWeek: 2, openTime: '09:00', closeTime: '18:00', isClosed: false },
      { dayOfWeek: 3, openTime: '09:00', closeTime: '18:00', isClosed: false },
      { dayOfWeek: 4, openTime: '09:00', closeTime: '18:00', isClosed: false },
      { dayOfWeek: 5, openTime: '09:00', closeTime: '17:00', isClosed: false },
      { dayOfWeek: 6, openTime: '10:00', closeTime: '14:00', isClosed: true },
    ],
    suggestedGreeting: 'Welcome! How can I help you today? Feel free to ask about our services or book a consultation.',
    escalationRules: {
      autoEscalateKeywords: ['complaint', 'refund', 'manager', 'emergency'],
      alertMethods: ['dashboard'],
      notifyEmail: '',
      inactivityTimeoutMinutes: 10,
    },
    slotDurationMinutes: 30,
  },
};
