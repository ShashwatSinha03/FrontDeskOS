import { LLMProviderFactory } from './llm/provider.factory';
import { persistLLMUsage } from './llm/usage-persistence.service';
import { logger } from '../lib/logger';

interface EscalationDetectorInput {
  businessId: string;
  businessType: string;
  businessName: string;
  message: string;
  history: { sender: string; content: string }[];
}

interface EscalationDetectorOutput {
  isEscalation: boolean;
  confidence: number;
  reason: string;
}

interface LLMResult {
  isEscalation: boolean;
  confidence: number;
  reason: string;
}

function buildEscalationDetectionPrompt(
  businessName: string,
  businessType: string,
  message: string,
  history: { sender: string; content: string }[]
): string {
  const historyBlock = history.length > 0
    ? history.map(h => `${h.sender === 'customer' ? 'Customer' : 'Assistant'}: ${h.content}`).join('\n')
    : 'No prior conversation history.';

  return `
You are an escalation detection system for ${businessName}, a ${businessType} business.

Your ONLY job is to determine whether the customer's latest message is requesting to speak with a human staff member (ESCALATE) versus asking an informational question (DO NOT ESCALATE).

This is NOT intent classification. This is specifically about detecting requests for human interaction.

BUSINESS-SPECIFIC ROLE TERMINOLOGY:
- Clinics (doctor, specialist, consultant): "Can I speak to the doctor?" → ESCALATE. "What are the doctor's timings?" → DO NOT ESCALATE.
- Salons (stylist, beautician, manager): "I want to talk to the manager" → ESCALATE. "Does the stylist do haircuts?" → DO NOT ESCALATE.
- Gyms (trainer, coach): "Can the trainer call me?" → ESCALATE. "What trainers do you have?" → DO NOT ESCALATE.
- General (owner, representative, support, staff, team member): "I need to speak to someone" → ESCALATE. "Who on your team performs this?" → DO NOT ESCALATE.

DISTINCTION RULES — CRITICAL:
- "Can I speak to [role]" → ESCALATE (requesting human interaction)
- "What are [role]'s [something]" → DO NOT ESCALATE (informational)
- "I want to talk to someone" → ESCALATE
- "Who performs this treatment" → DO NOT ESCALATE (informational)
- "Do you have [role] available" → DO NOT ESCALATE (informational)
- "I need to speak to a [role]" → ESCALATE
- "Can you connect me with [role]" → ESCALATE
- "Get me [role]" → ESCALATE
- "Is there a [role] I can talk to" → ESCALATE
- Questions about availability of services or staff members → DO NOT ESCALATE
- Questions about what services a particular role offers → DO NOT ESCALATE

CONVERSATION HISTORY:
${historyBlock}

CURRENT CUSTOMER MESSAGE:
${message}

Respond ONLY with valid JSON. No explanations. No markdown. Example:
{"isEscalation": false, "confidence": 0.95, "reason": "Customer is asking about timings, not requesting to speak with someone."}
`.trim();
}

function safeParseJson<T>(text: string): T | null {
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

export class EscalationDetectorService {
  private defaultThreshold: number;

  constructor(threshold?: number) {
    this.defaultThreshold = threshold ?? 0.7;
  }

  async detect(input: EscalationDetectorInput): Promise<EscalationDetectorOutput> {
    const provider = LLMProviderFactory.getProvider();

    const systemPrompt = buildEscalationDetectionPrompt(
      input.businessName,
      input.businessType,
      input.message,
      input.history
    );

    try {
      const response = await provider.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input.message },
      ], { temperature: 0.0, responseFormat: 'json' });

      const rawOutput = response.content;

      persistLLMUsage({
        businessId: input.businessId,
        provider: provider.name,
        model: response.model,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        totalTokens: response.usage.totalTokens,
        context: 'escalation_detector',
      }).catch((err) => {
        logger.error('Failed to persist escalation detector LLM usage', { route: 'EscalationDetector', businessId: input.businessId, error: err instanceof Error ? err.message : String(err) });
      });

      const parsed = safeParseJson<LLMResult>(rawOutput);

      if (!parsed || typeof parsed.isEscalation !== 'boolean' || typeof parsed.confidence !== 'number') {
        logger.warn('EscalationDetector: Failed to parse LLM output', {
          businessId: input.businessId,
          rawOutput,
        });
        return { isEscalation: false, confidence: 0, reason: 'Failed to parse LLM response' };
      }

      return {
        isEscalation: parsed.isEscalation && parsed.confidence >= this.defaultThreshold,
        confidence: parsed.confidence,
        reason: parsed.reason || 'No reason provided',
      };
    } catch (err) {
      logger.error('EscalationDetector: LLM call failed', {
        businessId: input.businessId,
        error: err instanceof Error ? err.message : String(err),
      });
      return { isEscalation: false, confidence: 0, reason: 'LLM call failed' };
    }
  }
}

export const escalationDetectorService = new EscalationDetectorService();
export default escalationDetectorService;
