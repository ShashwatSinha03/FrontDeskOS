import pool from '../config/db';
import { FollowUp, FollowUpType, FollowUpStatus, FollowUpChannel, FollowUpTriggerReason } from '../types';

export class FollowUpRepository {
  async schedule(data: {
    customerId: string;
    businessId: string;
    type: FollowUpType;
    scheduledAt: Date;
    channel?: FollowUpChannel;
    triggerReason?: FollowUpTriggerReason;
    attemptNumber?: number;
    metadata?: Record<string, any>;
    voiceCallId?: string;
  }): Promise<FollowUp | null> {
    const query = `
      INSERT INTO follow_ups (customer_id, business_id, type, channel, trigger_reason, attempt_number, scheduled_at, voice_call_id, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (voice_call_id) WHERE voice_call_id IS NOT NULL DO NOTHING
      RETURNING *
    `;
    const res = await pool.query(query, [
      data.customerId,
      data.businessId,
      data.type,
      data.channel || 'web_chat',
      data.triggerReason || 'inactivity',
      data.attemptNumber || 1,
      data.scheduledAt,
      data.voiceCallId || null,
      JSON.stringify(data.metadata || {}),
    ]);
    if (res.rows.length === 0) return null;
    return this.mapToEntity(res.rows[0]);
  }

  async markSent(id: string): Promise<void> {
    const query = `
      UPDATE follow_ups
      SET status = 'sent', sent_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `;
    await pool.query(query, [id]);
  }

  async cancelPending(customerId: string, type?: FollowUpType): Promise<void> {
    let query = `
      UPDATE follow_ups
      SET status = 'cancelled', updated_at = NOW()
      WHERE customer_id = $1 AND status = 'pending'
    `;
    const params: any[] = [customerId];

    if (type) {
      query += ` AND type = $2`;
      params.push(type);
    }

    await pool.query(query, params);
  }

  async cancelById(id: string, businessId: string): Promise<void> {
    const query = `
      UPDATE follow_ups
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1 AND business_id = $2 AND status = 'pending'
    `;
    const res = await pool.query(query, [id, businessId]);
    if (res.rowCount === 0) throw new Error('Follow-up not found or does not belong to this business');
  }

  async findByBusiness(
    businessId: string,
    filters?: {
      status?: FollowUpStatus;
      type?: FollowUpType;
    },
    pagination?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ followUps: any[]; totalCount: number }> {
    let query = `
      SELECT fu.*,
             c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
             COUNT(*) OVER() as total_count
      FROM follow_ups fu
      LEFT JOIN customers c ON c.id = fu.customer_id
      WHERE fu.business_id = $1
    `;
    const params: any[] = [businessId];
    let paramIndex = 2;

    if (filters?.status) {
      query += ` AND fu.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.type) {
      query += ` AND fu.type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    query += ` ORDER BY fu.scheduled_at DESC`;

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const res = await pool.query(query, params);

    if (res.rows.length === 0) {
      return { followUps: [], totalCount: 0 };
    }

    const totalCount = parseInt(res.rows[0].total_count, 10);
    const followUps = res.rows.map(row => ({
      ...this.mapToEntity(row),
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
    }));

    return { followUps, totalCount };
  }

  async findByCustomerWithName(customerId: string): Promise<any[]> {
    const query = `
      SELECT fu.*, c.name as customer_name
      FROM follow_ups fu
      LEFT JOIN customers c ON c.id = fu.customer_id
      WHERE fu.customer_id = $1
      ORDER BY fu.scheduled_at DESC
    `;
    const res = await pool.query(query, [customerId]);
    return res.rows.map(row => ({
      ...this.mapToEntity(row),
      customerName: row.customer_name,
    }));
  }

  async findByCustomer(customerId: string): Promise<FollowUp[]> {
    const query = `SELECT * FROM follow_ups WHERE customer_id = $1 ORDER BY scheduled_at DESC`;
    const res = await pool.query(query, [customerId]);
    return res.rows.map(r => this.mapToEntity(r));
  }

  async findDueToProcess(now: Date = new Date()): Promise<FollowUp[]> {
    const query = `
      SELECT * FROM follow_ups
      WHERE status = 'pending' AND scheduled_at <= $1
      ORDER BY scheduled_at ASC
    `;
    const res = await pool.query(query, [now]);
    return res.rows.map(row => this.mapToEntity(row));
  }

  private mapToEntity(row: any): FollowUp {
    return {
      id: row.id,
      customerId: row.customer_id,
      businessId: row.business_id,
      type: row.type as FollowUpType,
      channel: (row.channel || 'web_chat') as FollowUpChannel,
      triggerReason: (row.trigger_reason || 'inactivity') as FollowUpTriggerReason,
      attemptNumber: row.attempt_number || 1,
      scheduledAt: new Date(row.scheduled_at),
      status: row.status as FollowUpStatus,
      sentAt: row.sent_at ? new Date(row.sent_at) : null,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
export default FollowUpRepository;
