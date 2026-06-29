import type { Scenario } from '../../engine/types';

export const greetingScenario: Scenario = {
  id: 'greeting',
  name: 'Greeting',
  triggerKeywords: ['hello', 'hi', 'hey'],
  entryNodeId: 'welcome',
  nodes: {
    welcome: {
      id: 'welcome',
      aiMessage: "Welcome to Apex Dental Care! I'm your virtual assistant. How can I help you today? You can ask about our services, book an appointment, or check pricing.",
      quickReplies: ['Book an Appointment', 'View Services', 'Pricing Info', 'Talk to a Human'],
    },
  },
};
