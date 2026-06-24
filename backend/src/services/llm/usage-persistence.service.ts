import pool from '../../config/db';
import { estimateLLMCost } from './cost-estimator.service';
import { logger } from '../../lib/logger';

export interface PersistLLMUsageParams {
  businessId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  context: string;
  conversationId?: string;
  customerId?: string;
}

export async function persistLLMUsage(params: PersistLLMUsageParams): Promise<void> {
  try {
    const estimatedCostUsd = estimateLLMCost(params.provider, {
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens: params.totalTokens,
    });

    await pool.query(
      `INSERT INTO llm_usage (business_id, provider, model, input_tokens, output_tokens, total_tokens, estimated_cost_usd, context, conversation_id, customer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        params.businessId,
        params.provider,
        params.model,
        params.inputTokens,
        params.outputTokens,
        params.totalTokens,
        estimatedCostUsd,
        params.context,
        params.conversationId || null,
        params.customerId || null,
      ]
    );
  } catch (err) {
    logger.error('Failed to persist LLM usage', {
      route: 'usagePersistence',
      businessId: params.businessId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
