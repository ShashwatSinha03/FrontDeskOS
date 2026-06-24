import pool from '../config/db';

export interface LLMUsageRecord {
  id: string;
  businessId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  context: string | null;
  conversationId: string | null;
  customerId: string | null;
  createdAt: Date;
}

export interface UsageAggregation {
  totalCost: number;
  totalTokens: number;
  totalCalls: number;
  byContext: { context: string; cost: number; calls: number }[];
  byProvider: { provider: string; cost: number; calls: number }[];
  dailyTotals: { date: string; cost: number; calls: number }[];
  topConversations: { conversationId: string; cost: number; calls: number }[];
}

export class LLMUsageRepository {
  async findByBusiness(
    businessId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<LLMUsageRecord[]> {
    let query = `
      SELECT id, business_id, provider, model, input_tokens, output_tokens, total_tokens,
             estimated_cost_usd, context, conversation_id, customer_id, created_at
      FROM llm_usage
      WHERE business_id = $1
    `;
    const params: unknown[] = [businessId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return result.rows.map(this.mapRow);
  }

  async getAggregation(
    businessId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<UsageAggregation> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (businessId) {
      conditions.push(`business_id = $${paramIndex}`);
      params.push(businessId);
      paramIndex++;
    }
    if (startDate) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [totalResult, byContextResult, byProviderResult, dailyResult, topConvResult] =
      await Promise.all([
        pool.query(
          `SELECT COALESCE(SUM(estimated_cost_usd), 0)::numeric(12,8) AS total_cost,
                  COALESCE(SUM(total_tokens), 0)::bigint AS total_tokens,
                  COUNT(*)::int AS total_calls
           FROM llm_usage ${whereClause}`,
          params,
        ),
        pool.query(
          `SELECT context, COALESCE(SUM(estimated_cost_usd), 0)::numeric(12,8) AS cost,
                  COUNT(*)::int AS calls
           FROM llm_usage ${whereClause}
           GROUP BY context ORDER BY cost DESC`,
          params,
        ),
        pool.query(
          `SELECT provider, COALESCE(SUM(estimated_cost_usd), 0)::numeric(12,8) AS cost,
                  COUNT(*)::int AS calls
           FROM llm_usage ${whereClause}
           GROUP BY provider ORDER BY cost DESC`,
          params,
        ),
        pool.query(
          `SELECT DATE(created_at) AS date,
                  COALESCE(SUM(estimated_cost_usd), 0)::numeric(12,8) AS cost,
                  COUNT(*)::int AS calls
           FROM llm_usage ${whereClause}
           GROUP BY DATE(created_at) ORDER BY date DESC
           LIMIT 30`,
          params,
        ),
        pool.query(
          `SELECT conversation_id, COALESCE(SUM(estimated_cost_usd), 0)::numeric(12,8) AS cost,
                  COUNT(*)::int AS calls
           FROM llm_usage ${whereClause}
           GROUP BY conversation_id
           ORDER BY cost DESC
           LIMIT 10`,
          params,
        ),
      ]);

    const total = totalResult.rows[0];

    return {
      totalCost: parseFloat(total.total_cost),
      totalTokens: parseInt(total.total_tokens, 10),
      totalCalls: total.total_calls,
      byContext: byContextResult.rows.map((r: any) => ({
        context: r.context || 'unknown',
        cost: parseFloat(r.cost),
        calls: r.calls,
      })),
      byProvider: byProviderResult.rows.map((r: any) => ({
        provider: r.provider,
        cost: parseFloat(r.cost),
        calls: r.calls,
      })),
      dailyTotals: dailyResult.rows.map((r: any) => ({
        date: r.date,
        cost: parseFloat(r.cost),
        calls: r.calls,
      })),
      topConversations: topConvResult.rows.map((r: any) => ({
        conversationId: r.conversation_id,
        cost: parseFloat(r.cost),
        calls: r.calls,
      })),
    };
  }

  async getPerBusinessSummary(): Promise<
    { businessId: string; businessName: string; totalCost: number; totalCalls: number }[]
  > {
    const result = await pool.query(`
      SELECT u.business_id, b.name AS business_name,
             COALESCE(SUM(u.estimated_cost_usd), 0)::numeric(12,8) AS total_cost,
             COUNT(*)::int AS total_calls
      FROM llm_usage u
      JOIN businesses b ON b.id = u.business_id
      GROUP BY u.business_id, b.name
      ORDER BY total_cost DESC
    `);
    return result.rows.map((r: any) => ({
      businessId: r.business_id,
      businessName: r.business_name,
      totalCost: parseFloat(r.total_cost),
      totalCalls: r.total_calls,
    }));
  }

  private mapRow(row: any): LLMUsageRecord {
    return {
      id: row.id,
      businessId: row.business_id,
      provider: row.provider,
      model: row.model,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      totalTokens: row.total_tokens,
      estimatedCostUsd: parseFloat(row.estimated_cost_usd),
      context: row.context,
      conversationId: row.conversation_id,
      customerId: row.customer_id,
      createdAt: new Date(row.created_at),
    };
  }
}

export const llmUsageRepository = new LLMUsageRepository();
