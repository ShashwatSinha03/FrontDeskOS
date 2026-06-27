import type { ScenarioId } from './types';

const KEYWORD_MAP: [RegExp, ScenarioId][] = [
  [/book(ing)?|appointment|schedule|reserve|((can|could|id|i'?d) (like|love) to)/i, 'booking'],
  [/price|cost|how much|pricing|rate|fee|charge|costs|how (much|many)|what('s| is) the price/i, 'pricing'],
  [/human|doctor|speak|talk (to|with)|real person|receptionist|call me|transfer|connect|speak to someone|need a (real|actual) person|let me talk|i want to (speak|talk)/i, 'escalation'],
  [/hour|open|close|location|address|parking|insurance|emergency|cancel|reschedule|policy|when (are|do) (you|they)/i, 'faq'],
  [/hello|hi|hey|start|help|morning|evening|howdy|good (morning|afternoon|evening)/i, 'greeting'],
];

export function matchIntent(input: string): ScenarioId | null {
  const lower = input.trim();
  if (!lower) return null;
  for (const [regex, scenario] of KEYWORD_MAP) {
    if (regex.test(lower)) return scenario;
  }
  return null;
}
