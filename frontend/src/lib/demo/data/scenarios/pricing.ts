import type { Scenario } from '../../engine/types';

export const pricingScenario: Scenario = {
  id: 'pricing',
  name: 'Pricing Information',
  triggerKeywords: ['price', 'cost', 'pricing', 'how much'],
  entryNodeId: 'show_pricing',
  nodes: {
    show_pricing: {
      id: 'show_pricing',
      aiMessage: "Here's our pricing: Teeth Whitening ($350-$600), Routine Cleaning ($120-$200), Dental Checkup ($150-$250), Fillings ($200-$500). We accept most major insurance plans. Would you like to book any of these services?",
      quickReplies: ['Book Teeth Whitening', 'Book Cleaning', 'Check Insurance', 'No thanks'],
      transitions: {
        'Book Teeth Whitening': 'booking_referral',
        'Book Cleaning': 'booking_referral',
        'Check Insurance': 'insurance_info',
        'No thanks': 'done',
      },
    },
    booking_referral: {
      id: 'booking_referral',
      aiMessage: "Let's get that set up for you! What day works best for your appointment?",
      quickReplies: ['Today', 'Tomorrow', 'This Week'],
      transitions: {
        'Today': 'booking_time',
        'Tomorrow': 'booking_time',
        'This Week': 'booking_time',
      },
    },
    booking_time: {
      id: 'booking_time',
      aiMessage: 'What time works best? We have 9:00 AM, 11:00 AM, 2:00 PM, or 4:00 PM available.',
      quickReplies: ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'],
      transitions: {
        '9:00 AM': 'booking_confirm',
        '11:00 AM': 'booking_confirm',
        '2:00 PM': 'booking_confirm',
        '4:00 PM': 'booking_confirm',
      },
    },
    booking_confirm: {
      id: 'booking_confirm',
      aiMessage: "You're all set! Your appointment has been booked. Is there anything else I can help you with?",
      effects: [{
        type: 'appointment_created',
        payload: { service: 'Consultation', date: 'today', time: 'selected', customerName: 'Demo Visitor' },
      }],
    },
    insurance_info: {
      id: 'insurance_info',
      aiMessage: 'We accept most major dental insurance plans including Delta Dental, MetLife, Cigna, and Aetna. Our team can verify your coverage before your visit. Would you like to proceed with booking?',
      quickReplies: ['Book Now', 'More Questions'],
      transitions: { 'Book Now': 'booking_time', 'More Questions': 'done' },
    },
    done: {
      id: 'done',
      aiMessage: "Feel free to reach out if you have any more questions. Have a great day!",
    },
  },
};
