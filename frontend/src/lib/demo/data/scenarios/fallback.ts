import type { Scenario } from '../../engine/types';

export const fallbackScenario: Scenario = {
  id: 'fallback',
  name: 'Fallback',
  triggerKeywords: [],
  entryNodeId: 'fallback',
  nodes: {
    fallback: {
      id: 'fallback',
      aiMessage: "I'm not sure I understood that. Could you please rephrase? You can ask me about appointments, pricing, services, or our location.",
      quickReplies: ['Book Appointment', 'Pricing', 'Services', 'Talk to Human'],
    },
  },
};
