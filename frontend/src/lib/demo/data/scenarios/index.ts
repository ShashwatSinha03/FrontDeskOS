import type { Scenario, ScenarioId } from '../../engine/types';
import { greetingScenario } from './greeting';
import { bookingScenario } from './booking';
import { pricingScenario } from './pricing';
import { escalationScenario } from './escalation';
import { faqScenario } from './faq';
import { fallbackScenario } from './fallback';

export const scenarios: Record<ScenarioId, Scenario> = {
  greeting: greetingScenario,
  booking: bookingScenario,
  pricing: pricingScenario,
  escalation: escalationScenario,
  faq: faqScenario,
  fallback: fallbackScenario,
};

export { greetingScenario, bookingScenario, pricingScenario, escalationScenario, faqScenario, fallbackScenario };
