export interface LLMUsageInput {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

const PROVIDER_PRICING: Record<string, { inputPer1K: number; outputPer1K: number }> = {
  groq: { inputPer1K: 0.00005, outputPer1K: 0.00008 },
  openai: { inputPer1K: 0.0025, outputPer1K: 0.010 },
  anthropic: { inputPer1K: 0.003, outputPer1K: 0.015 },
};

const DEFAULT_PRICING = { inputPer1K: 0.00005, outputPer1K: 0.00008 };

const CHANNEL_COST_PER_MSG: Record<string, number> = {
  web_chat: 0,
  whatsapp: 0.005,
  voice: 0.013,
  sms: 0.0079,
};

export function estimateLLMCost(providerName: string, usage: LLMUsageInput): number {
  const pricing = PROVIDER_PRICING[providerName.toLowerCase()] || DEFAULT_PRICING;
  const inputCost = (usage.inputTokens / 1000) * pricing.inputPer1K;
  const outputCost = (usage.outputTokens / 1000) * pricing.outputPer1K;
  return Math.round((inputCost + outputCost) * 1e8) / 1e8;
}

export function estimateChannelCost(channelType: string): number {
  return CHANNEL_COST_PER_MSG[channelType.toLowerCase()] ?? 0;
}
