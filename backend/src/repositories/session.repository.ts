import pool from '../config/db';
import { CustomerSession } from '../types';

export class SessionRepository {
  async findBySessionId(sessionId: string, businessId: string): Promise<CustomerSession | null> {
    const query = `
      SELECT id, session_id, customer_id, business_id, last_active_at, created_at
      FROM customer_sessions
      WHERE session_id = $1 AND business_id = $2
    `;
    const res = await pool.query(query, [sessionId, businessId]);
    if (res.rows.length === 0) return null;
    return this.mapToEntity(res.rows[0]);
  }

  async create(businessId: string, sessionId: string): Promise<CustomerSession> {
    const query = `
      INSERT INTO customer_sessions (session_id, business_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    const res = await pool.query(query, [sessionId, businessId]);
    return this.mapToEntity(res.rows[0]);
  }

  async updateCustomer(sessionId: string, businessId: string, customerId: string): Promise<void> {
    const query = `
      UPDATE customer_sessions
      SET customer_id = $3, last_active_at = NOW()
      WHERE session_id = $1 AND business_id = $2
    `;
    await pool.query(query, [sessionId, businessId, customerId]);
  }

  private mapToEntity(row: any): CustomerSession {
    return {
      id: row.id,
      sessionId: row.session_id,
      customerId: row.customer_id,
      businessId: row.business_id,
      lastActiveAt: new Date(row.last_active_at),
      createdAt: new Date(row.created_at),
    };
  }
}

export const sessionRepository = new SessionRepository();
export default SessionRepository;
