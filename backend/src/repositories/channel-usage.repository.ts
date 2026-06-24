import pool from '../config/db';

export interface ChannelUsageRecord {
  id: string;
  businessId: string;
  channelType: string;
  direction: string;
  messageId: string | null;
  conversationId: string | null;
  customerId: string | null;
  estimatedCostUsd: number;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface ChannelUsageSummary {
  totalCost: number;
  totalMessages: number;
  byChannel: { channelType: string; cost: number; count: number }[];
}

export class ChannelUsageRepository {
  async create(params: {
    businessId: string;
    channelType: string;
    direction: string;
    messageId: string;
    conversationId: string;
    customerId: string;
    estimatedCostUsd: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO channel_usage (business_id, channel_type, direction, message_id, conversation_id, customer_id, estimated_cost_usd, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        params.businessId,
        params.channelType,
        params.direction,
        params.messageId,
        params.conversationId,
        params.customerId,
        params.estimatedCostUsd,
        JSON.stringify(params.metadata || {}),
      ]
    );
  }
  async findByBusiness(
    businessId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ChannelUsageRecord[]> {
    let query = `
      SELECT id, business_id, channel_type, direction, message_id, conversation_id,
             customer_id, estimated_cost_usd, metadata, created_at
      FROM channel_usage
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

  async getSummary(
    businessId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ChannelUsageSummary> {
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

    const [totalResult, byChannelResult] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(estimated_cost_usd), 0)::numeric(12,8) AS total_cost,
                COUNT(*)::int AS total_messages
         FROM channel_usage ${whereClause}`,
        params,
      ),
      pool.query(
        `SELECT channel_type, COALESCE(SUM(estimated_cost_usd), 0)::numeric(12,8) AS cost,
                COUNT(*)::int AS count
         FROM channel_usage ${whereClause}
         GROUP BY channel_type ORDER BY cost DESC`,
        params,
      ),
    ]);

    const total = totalResult.rows[0];

    return {
      totalCost: parseFloat(total.total_cost),
      totalMessages: total.total_messages,
      byChannel: byChannelResult.rows.map((r: any) => ({
        channelType: r.channel_type,
        cost: parseFloat(r.cost),
        count: r.count,
      })),
    };
  }

  async getPerBusinessSummary(): Promise<
    { businessId: string; businessName: string; totalCost: number; totalMessages: number }[]
  > {
    const result = await pool.query(`
      SELECT cu.business_id, b.name AS business_name,
             COALESCE(SUM(cu.estimated_cost_usd), 0)::numeric(12,8) AS total_cost,
             COUNT(*)::int AS total_messages
      FROM channel_usage cu
      JOIN businesses b ON b.id = cu.business_id
      GROUP BY cu.business_id, b.name
      ORDER BY total_cost DESC
    `);
    return result.rows.map((r: any) => ({
      businessId: r.business_id,
      businessName: r.business_name,
      totalCost: parseFloat(r.total_cost),
      totalMessages: r.total_messages,
    }));
  }

  private mapRow(row: any): ChannelUsageRecord {
    return {
      id: row.id,
      businessId: row.business_id,
      channelType: row.channel_type,
      direction: row.direction,
      messageId: row.message_id,
      conversationId: row.conversation_id,
      customerId: row.customer_id,
      estimatedCostUsd: parseFloat(row.estimated_cost_usd),
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
    };
  }
}

export const channelUsageRepository = new ChannelUsageRepository();
