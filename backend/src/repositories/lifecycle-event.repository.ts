import pool from '../config/db';

export interface LifecycleEvent {
  id: string;
  customerId: string;
  businessId: string;
  previousState: string | null;
  newState: string;
  triggerEvent: string;
  notes: string | null;
  changedBy: string | null;
  createdAt: Date;
}

export class LifecycleEventRepository {
  async findByCustomer(customerId: string, businessId: string): Promise<LifecycleEvent[]> {
    const query = `
      SELECT id, business_id, customer_id, previous_state, new_state, trigger_event, notes, changed_by, created_at
      FROM customer_lifecycle_events
      WHERE customer_id = $1 AND business_id = $2
      ORDER BY created_at DESC
    `;
    const res = await pool.query(query, [customerId, businessId]);
    return res.rows.map(row => ({
      id: row.id,
      customerId: row.customer_id,
      businessId: row.business_id,
      previousState: row.previous_state,
      newState: row.new_state,
      triggerEvent: row.trigger_event,
      notes: row.notes,
      changedBy: row.changed_by,
      createdAt: new Date(row.created_at),
    }));
  }
}
export default LifecycleEventRepository;
