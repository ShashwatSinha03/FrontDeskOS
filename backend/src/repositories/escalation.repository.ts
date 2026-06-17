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
  ): Promise<{ escalations: any[]; totalCount: number }> {
    let query = `
      SELECT e.id, e.customer_id, e.business_id, e.conversation_id, e.reason, e.status,
             e.first_response_at, e.returned_to_ai_count, e.resolved_by, e.resolution_note,
             e.resolved_at, e.created_at, e.updated_at,
             c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
             COUNT(*) OVER() as total_count
      FROM escalations e
      LEFT JOIN customers c ON c.id = e.customer_id
      WHERE e.business_id = $1
    `;
    const params: any[] = [businessId];
    let paramIndex = 2;

    if (filters?.status) {
      query += ` AND e.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    query += ` ORDER BY e.created_at DESC`;

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
    const escalations = res.rows.map(row => ({
      ...this.mapToEntity(row),
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
    }));
    
    return { escalations, totalCount };
  }

  /**
   * Resolve all pending escalations for a conversation.
   */
  async resolveForConversation(conversationId: string, businessId: string): Promise<void> {
    const query = `
      UPDATE escalations
      SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
      WHERE conversation_id = $1 AND business_id = $2 AND status = 'pending'
    `;
    await pool.query(query, [conversationId, businessId]);
  }

  /**
   * Find all pending escalations for a business (Backward-compatible).
   */
  async findPendingByBusiness(businessId: string): Promise<Escalation[]> {
    const result = await this.findByBusiness(businessId, { status: 'pending' }, { page: 1, limit: 100 });
    return result.escalations;
  }

  async findByCustomer(customerId: string, businessId: string): Promise<any[]> {
    const query = `
      SELECT e.id, e.customer_id, e.business_id, e.conversation_id, e.reason, e.status,
             e.first_response_at, e.returned_to_ai_count, e.resolved_by, e.resolution_note,
             e.resolved_at, e.created_at, e.updated_at,
             c.name as customer_name, c.email as customer_email, c.phone as customer_phone
      FROM escalations e
      LEFT JOIN customers c ON c.id = e.customer_id
      WHERE e.customer_id = $1 AND e.business_id = $2
      ORDER BY e.created_at DESC
    `;
    const res = await pool.query(query, [customerId, businessId]);
    return res.rows.map(row => ({
      ...this.mapToEntity(row),
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
    }));
  }

  private mapToEntity(row: any): Escalation {
    return {
      id: row.id,
      customerId: row.customer_id,
      businessId: row.business_id,
      conversationId: row.conversation_id,
      reason: row.reason,
      status: row.status as EscalationStatus,
      firstResponseAt: row.first_response_at ? new Date(row.first_response_at) : null,
      returnedToAICount: row.returned_to_ai_count || 0,
      resolvedBy: row.resolved_by || null,
      resolutionNote: row.resolution_note || null,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
export default EscalationRepository;
