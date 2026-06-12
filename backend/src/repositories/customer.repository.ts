import pool from '../config/db';
import { Customer, CustomerLifecycleState, ChannelType } from '../types';

export class CustomerRepository {
  /**
   * Find customer profile by channel (e.g. session id or phone number).
   * This is key to mapping multiple channels to a single customer.
   */
  async findByChannelIdentity(channelType: ChannelType, channelIdentity: string, businessId: string): Promise<Customer | null> {
    const query = `
      SELECT c.id, c.business_id, c.name, c.email, c.phone, c.lifecycle_state, c.last_interaction_at, c.created_at, c.updated_at
      FROM customers c
      JOIN customer_channels cc ON cc.customer_id = c.id
      WHERE cc.channel_type = $1 AND cc.channel_identity = $2 AND c.business_id = $3
    `;
    const res = await pool.query(query, [channelType, channelIdentity, businessId]);
    if (res.rows.length === 0) return null;
    return this.mapToEntity(res.rows[0]);
  }

  /**
   * Find a customer profile directly by its primary key ID.
   */
  async findById(id: string, businessId: string): Promise<Customer | null> {
    const query = `
      SELECT id, business_id, name, email, phone, lifecycle_state, last_interaction_at, created_at, updated_at
      FROM customers
      WHERE id = $1 AND business_id = $2
    `;
    const res = await pool.query(query, [id, businessId]);
    if (res.rows.length === 0) return null;
    return this.mapToEntity(res.rows[0]);
  }

  /**
   * Create a new customer profile.
   */
  async create(businessId: string, name?: string | null, email?: string | null, phone?: string | null): Promise<Customer> {
    const query = `
      INSERT INTO customers (business_id, name, email, phone, lifecycle_state, last_interaction_at)
      VALUES ($1, $2, $3, $4, 'New Inquiry', NOW())
      RETURNING *
    `;
    const res = await pool.query(query, [businessId, name || null, email || null, phone || null]);
    return this.mapToEntity(res.rows[0]);
  }

  /**
   * Link an external channel to an existing customer profile.
   * Business ID is resolved automatically from the customer record via a subquery.
   */
  async linkChannel(customerId: string, channelType: ChannelType, channelIdentity: string): Promise<void> {
    const query = `
      INSERT INTO customer_channels (customer_id, business_id, channel_type, channel_identity)
      VALUES ($1, (SELECT business_id FROM customers WHERE id = $1), $2, $3)
      ON CONFLICT (channel_type, channel_identity) DO NOTHING
    `;
    await pool.query(query, [customerId, channelType, channelIdentity]);
  }

  /**
   * Update the customer's lifecycle state.
   * The DB trigger log_customer_lifecycle_transition automatically creates an audit event.
   * The trigger_event is passed via session variable app.lifecycle_trigger.
   */
  async updateLifecycleState(
    id: string,
    businessId: string,
    state: CustomerLifecycleState,
    triggerEvent?: string | null
  ): Promise<void> {
    const customer = await this.findById(id, businessId);
    if (!customer) throw new Error('Customer not found');
    if (customer.lifecycleState === state) return;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `SELECT set_config('app.lifecycle_trigger', $1, true)`,
        [triggerEvent || 'system_update']
      );
      await client.query(
        `UPDATE customers SET lifecycle_state = $2, last_interaction_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [id, state]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update the contact profile details of a customer.
   */
  async updateProfile(id: string, businessId: string, updates: Partial<Pick<Customer, 'name' | 'email' | 'phone'>>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 3;

    Object.entries(updates).forEach(([key, val]) => {
      const dbKey = key === 'name' ? 'name' : key === 'email' ? 'email' : 'phone';
      fields.push(`${dbKey} = $${paramIndex}`);
      values.push(val);
      paramIndex++;
    });

    if (fields.length === 0) return;

    const query = `
      UPDATE customers
      SET ${fields.join(', ')}, last_interaction_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND business_id = $2
    `;
    await pool.query(query, [id, businessId, ...values]);
  }

  /**
   * List and page all customers/leads for a given business (used in Lead Dashboard).
   * Supports multi-criteria filtering, text search matching, and pagination.
   */
  async findAllByBusiness(
    businessId: string, 
    filters?: { 
      lifecycleState?: CustomerLifecycleState;
      search?: string;
    },
    pagination?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ customers: Customer[]; totalCount: number }> {
    let query = `
      SELECT id, business_id, name, email, phone, lifecycle_state, last_interaction_at, created_at, updated_at, COUNT(*) OVER() as total_count
      FROM customers
      WHERE business_id = $1
    `;
    const params: any[] = [businessId];
    let paramIndex = 2;

    if (filters?.lifecycleState) {
      query += ` AND lifecycle_state = $${paramIndex}`;
      params.push(filters.lifecycleState);
      paramIndex++;
    }

    if (filters?.search) {
      query += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ` ORDER BY last_interaction_at DESC`;

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const res = await pool.query(query, params);
    
    if (res.rows.length === 0) {
      return { customers: [], totalCount: 0 };
    }

    const totalCount = parseInt(res.rows[0].total_count, 10);
    const customers = res.rows.map(row => this.mapToEntity(row));
    
    return { customers, totalCount };
  }

  /**
   * Map database record to typed Customer entity.
   */
  private mapToEntity(row: any): Customer {
    return {
      id: row.id,
      businessId: row.business_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      lifecycleState: row.lifecycle_state as CustomerLifecycleState,
      lastInteractionAt: new Date(row.last_interaction_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
export default CustomerRepository;
