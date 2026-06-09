import pool from '../config/db';
import { Escalation, EscalationStatus } from '../types';

export class EscalationRepository {
  /**
   * Log a new escalation request.
   */
  async create(data: {
    customerId: string;
    businessId: string;
    conversationId: string;
    reason: string;
  }): Promise<Escalation> {
    const query = `
      INSERT INTO escalations (customer_id, business_id, conversation_id, reason, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `;
    const res = await pool.query(query, [
      data.customerId,
      data.businessId,
      data.conversationId,
      data.reason,
    ]);
    return this.mapToEntity(res.rows[0]);
  }

  /**
   * Mark an escalation as resolved.
   */
  async resolve(id: string, businessId: string): Promise<void> {
    const query = `
      UPDATE escalations
      SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND business_id = $2
    `;
    const res = await pool.query(query, [id, businessId]);
    if (res.rowCount === 0) throw new Error('Escalation not found or does not belong to this business');
  }

  /**
   * Find escalations for a business.
   * Supports pagination and status filtering (pending vs resolved).
   */
  async findByBusiness(
    businessId: string,
    filters?: {
      status?: EscalationStatus;
    },
    pagination?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ escalations: Escalation[]; totalCount: number }> {
    let query = `
      SELECT id, customer_id, business_id, conversation_id, reason, status, resolved_at, created_at, updated_at, COUNT(*) OVER() as total_count
      FROM escalations
      WHERE business_id = $1
    `;
    const params: any[] = [businessId];
    let paramIndex = 2;

    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const res = await pool.query(query, params);
    
    if (res.rows.length === 0) {
      return { escalations: [], totalCount: 0 };
    }

    const totalCount = parseInt(res.rows[0].total_count, 10);
    const escalations = res.rows.map(row => this.mapToEntity(row));
    
    return { escalations, totalCount };
  }

  /**
   * Find all pending escalations for a business (Backward-compatible).
   */
  async findPendingByBusiness(businessId: string): Promise<Escalation[]> {
    const result = await this.findByBusiness(businessId, { status: 'pending' }, { page: 1, limit: 100 });
    return result.escalations;
  }

  private mapToEntity(row: any): Escalation {
    return {
      id: row.id,
      customerId: row.customer_id,
      businessId: row.business_id,
      conversationId: row.conversation_id,
      reason: row.reason,
      status: row.status as EscalationStatus,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
export default EscalationRepository;
