import pool from '../config/db';
import { KnowledgeRequest, KnowledgeRequestStatus } from '../types';

export class KnowledgeRequestRepository {
  /**
   * Log an unknown query that requires training.
   */
  async create(data: {
    businessId: string;
    conversationId: string;
    unansweredQuestion: string;
    suggestedAnswer?: string | null;
  }): Promise<KnowledgeRequest> {
    const query = `
      INSERT INTO knowledge_requests (business_id, conversation_id, unanswered_question, suggested_answer, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `;
    const res = await pool.query(query, [
      data.businessId,
      data.conversationId,
      data.unansweredQuestion,
      data.suggestedAnswer || null,
    ]);
    return this.mapToEntity(res.rows[0]);
  }

  /**
   * Update approval status and optional answer text.
   */
  async updateStatus(
    id: string,
    status: KnowledgeRequestStatus,
    businessId: string,
    suggestedAnswer?: string | null
  ): Promise<KnowledgeRequest> {
    let query = `
      UPDATE knowledge_requests
      SET status = $2, updated_at = NOW()
    `;
    const params: any[] = [id, status];

    if (suggestedAnswer !== undefined) {
      query += `, suggested_answer = $3`;
      params.push(suggestedAnswer);
    }

    query += ` WHERE id = $1 AND business_id = $${params.length + 1} RETURNING *`;
    params.push(businessId);

    const res = await pool.query(query, params);
    if (res.rows.length === 0) {
      throw new Error(`Knowledge request not found or does not belong to this business`);
    }
    return this.mapToEntity(res.rows[0]);
  }

  /**
   * Find knowledge requests for a business.
   * Supports pagination and status filtering (pending, approved, rejected).
   */
  async findByBusiness(
    businessId: string,
    filters?: {
      status?: KnowledgeRequestStatus;
    },
    pagination?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ requests: KnowledgeRequest[]; totalCount: number }> {
    let query = `
      SELECT id, business_id, conversation_id, unanswered_question, suggested_answer, status, created_at, updated_at, COUNT(*) OVER() as total_count
      FROM knowledge_requests
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
      return { requests: [], totalCount: 0 };
    }

    const totalCount = parseInt(res.rows[0].total_count, 10);
    const requests = res.rows.map(row => this.mapToEntity(row));
    
    return { requests, totalCount };
  }

  /**
   * List all pending knowledge training requests for review (Backward-compatible).
   */
  async findPendingByBusiness(businessId: string): Promise<KnowledgeRequest[]> {
    const result = await this.findByBusiness(businessId, { status: 'pending' }, { page: 1, limit: 100 });
    return result.requests;
  }

  private mapToEntity(row: any): KnowledgeRequest {
    return {
      id: row.id,
      businessId: row.business_id,
      conversationId: row.conversation_id,
      unansweredQuestion: row.unanswered_question,
      suggestedAnswer: row.suggested_answer,
      status: row.status as KnowledgeRequestStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
export default KnowledgeRequestRepository;
