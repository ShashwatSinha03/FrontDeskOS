import type { Scenario } from '../../engine/types';

export const bookingScenario: Scenario = {
  id: 'booking',
  name: 'Appointment Booking',
  triggerKeywords: ['book', 'appointment', 'schedule'],
  entryNodeId: 'ask_service',
  nodes: {
    ask_service: {
      id: 'ask_service',
      aiMessage: "I'd be happy to help you book an appointment! What service are you interested in? We offer teeth whitening, routine cleaning, dental checkups, and fillings.",
      quickReplies: ['Teeth Whitening', 'Routine Cleaning', 'Dental Checkup', 'Fillings'],
      transitions: {
        'Teeth Whitening': 'ask_date',
        'Routine Cleaning': 'ask_date',
        'Dental Checkup': 'ask_date',
        'Fillings': 'ask_date',
      },
    },
    ask_date: {
      id: 'ask_date',
      aiMessage: 'Great choice! What day works best for you?',
      quickReplies: ['Today', 'Tomorrow', 'This Week'],
      transitions: {
        'Today': 'ask_time',
        'Tomorrow': 'ask_time',
        'This Week': 'ask_time',
      },
    },
    ask_time: {
      id: 'ask_time',
      aiMessage: 'What time would you prefer? We have availability at:',
      quickReplies: ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'],
      transitions: {
        '9:00 AM': 'confirm',
        '11:00 AM': 'confirm',
        '2:00 PM': 'confirm',
        '4:00 PM': 'confirm',
      },
    },
    confirm: {
      id: 'confirm',
      aiMessage: "Perfect! Your appointment has been confirmed. You'll receive a confirmation via text. Is there anything else I can help you with?",
      quickReplies: ['No, thanks!', 'I have another question'],
      effects: [{
        type: 'appointment_created',
        payload: { service: '{selected_service}', date: '{selected_date}', time: '{selected_time}', customerName: 'Demo Visitor' },
      }],
    },
  },
};
