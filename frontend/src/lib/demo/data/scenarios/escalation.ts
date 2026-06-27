import type { Scenario } from '../../engine/types';

export const escalationScenario: Scenario = {
  id: 'escalation',
  name: 'Human Escalation',
  triggerKeywords: ['human', 'doctor', 'speak', 'talk', 'real person', 'transfer'],
  entryNodeId: 'confirm_escalation',
  nodes: {
    confirm_escalation: {
      id: 'confirm_escalation',
      aiMessage: "I understand you'd like to speak with a team member. I'll transfer you to a human agent right away. Someone will be with you shortly.",
      effects: [{
        type: 'escalation_created',
        payload: { conversationId: 'conv-current', reason: 'Customer requested human assistance' },
      }],
    },
  },
};
