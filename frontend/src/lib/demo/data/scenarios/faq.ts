import type { Scenario } from '../../engine/types';

export const faqScenario: Scenario = {
  id: 'faq',
  name: 'FAQ',
  triggerKeywords: ['hours', 'location', 'insurance', 'emergency', 'cancel'],
  entryNodeId: 'faq_menu',
  nodes: {
    faq_menu: {
      id: 'faq_menu',
      aiMessage: "I can help with common questions. What would you like to know?",
      quickReplies: ['Business Hours', 'Location & Parking', 'Insurance', 'Emergency Care', 'Cancellation Policy'],
      transitions: {
        'Business Hours': 'hours',
        'Location & Parking': 'location',
        'Insurance': 'insurance',
        'Emergency Care': 'emergency',
        'Cancellation Policy': 'cancellation',
      },
    },
    hours: {
      id: 'hours',
      aiMessage: "We're open Monday-Friday 8:00 AM - 6:00 PM and Saturday 9:00 AM - 2:00 PM. We're closed on Sundays. Does that help?",
      quickReplies: ['Book Appointment', 'Other Question'],
      transitions: { 'Book Appointment': 'booking_ref', 'Other Question': 'faq_menu' },
    },
    location: {
      id: 'location',
      aiMessage: "We're located at 123 Medical Center Drive, Suite 200, San Francisco, CA 94102. Free parking is available in the building garage. We're also accessible via BART (Civic Center stop).",
      quickReplies: ['Book Appointment', 'Other Question'],
      transitions: { 'Book Appointment': 'booking_ref', 'Other Question': 'faq_menu' },
    },
    insurance: {
      id: 'insurance',
      aiMessage: 'We accept Delta Dental, MetLife, Cigna, Aetna, and most major PPO plans. Our team will verify your coverage before your visit. Would you like to check if we accept your specific plan?',
      quickReplies: ['Book Appointment', 'Other Question'],
      transitions: { 'Book Appointment': 'booking_ref', 'Other Question': 'faq_menu' },
    },
    emergency: {
      id: 'emergency',
      aiMessage: "If you're experiencing a dental emergency, please call us immediately at (555) 123-4567. For life-threatening emergencies, call 911. We reserve same-day slots for urgent cases.",
      quickReplies: ['Book Appointment', 'Call Now', 'Other Question'],
      transitions: { 'Book Appointment': 'booking_ref', 'Call Now': 'done', 'Other Question': 'faq_menu' },
    },
    cancellation: {
      id: 'cancellation',
      aiMessage: "You can cancel or reschedule up to 24 hours before your appointment without any fee. Late cancellations may incur a $50 charge. Would you like to manage an existing appointment?",
      quickReplies: ['Yes, Cancel', 'No thanks'],
      transitions: { 'Yes, Cancel': 'cancel_confirm', 'No thanks': 'done' },
    },
    cancel_confirm: {
      id: 'cancel_confirm',
      aiMessage: "I've noted your request. Our team will follow up to help you with the cancellation. Is there anything else I can help with?",
      effects: [{ type: 'conversation_updated', payload: { status: 'pending' } }],
    },
    booking_ref: {
      id: 'booking_ref',
      aiMessage: "I'd be happy to help you book! What service are you interested in?",
      quickReplies: ['Teeth Whitening', 'Routine Cleaning', 'Dental Checkup'],
      transitions: { 'Teeth Whitening': 'booking_time_short', 'Routine Cleaning': 'booking_time_short', 'Dental Checkup': 'booking_time_short' },
    },
    booking_time_short: {
      id: 'booking_time_short',
      aiMessage: 'What time works best? We have 9:00 AM, 11:00 AM, 2:00 PM, or 4:00 PM.',
      quickReplies: ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'],
      transitions: { '9:00 AM': 'booked', '11:00 AM': 'booked', '2:00 PM': 'booked', '4:00 PM': 'booked' },
    },
    booked: {
      id: 'booked',
      aiMessage: "You're all set! Your appointment is confirmed. Anything else I can help with?",
      effects: [{ type: 'appointment_created', payload: { service: 'Dental Service', date: 'today', time: 'selected', customerName: 'Demo Visitor' } }],
    },
    done: {
      id: 'done',
      aiMessage: "Feel free to reach out anytime. Have a great day!",
    },
  },
};
