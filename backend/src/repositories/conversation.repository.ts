import pool from '../config/db';
import { Conversation, ConversationOwnershipStatus, Message, MessageSender, ChannelType } from '../types';

export class ConversationRepository {
  /**
   * Find an active conversation for a customer.
   */
  async findActiveByCustomer(customerId: string, businessId: string): Promise<Conversation | null> {
    const query = `
      SELECT id, customer_id, business_id, status, channel_type, ownership_status, human_owner_id, escalated_at, assigned_at, created_at, updated_at
      FROM conversations
      WHERE customer_id = $1 AND business_id = $2 AND status = 'active'
    `;
    const res = await pool.query(query, [customerId, businessId]);
    if (res.rows.length === 0) return null;
    return this.mapToConversationEntity(res.rows[0]);
  }

  /**
   * Create a new conversation session.
   */
  async create(customerId: string, businessId: string, channelType: ChannelType): Promise<Conversation> {
    const query = `
      INSERT INTO conversations (customer_id, business_id, status, channel_type, ownership_status)
      VALUES ($1, $2, 'active', $3, 'ai_active')
      RETURNING *
    `;
    const res = await pool.query(query, [customerId, businessId, channelType]);
    return this.mapToConversationEntity(res.rows[0]);
  }

  /**
   * Find all conversations for a customer.
   */
  async findByCustomer(customerId: string, businessId: string): Promise<Conversation[]> {
    const query = `
      SELECT id, customer_id, business_id, status, channel_type, ownership_status, human_owner_id, escalated_at, assigned_at, created_at, updated_at
      FROM conversations
      WHERE customer_id = $1 AND business_id = $2
      ORDER BY created_at DESC
    `;
    const res = await pool.query(query, [customerId, businessId]);
    return res.rows.map(r => this.mapToConversationEntity(r));
  }

  /**
   * Close a conversation session.
   */
  async close(id: string, businessId: string): Promise<void> {
    const query = `
      UPDATE conversations
      SET status = 'closed', updated_at = NOW()
      WHERE id = $1 AND business_id = $2
    `;
    await pool.query(query, [id, businessId]);
  }

  /**
   * Record a transcript message in the database.
   */
  async addMessage(
    conversationId: string,
    sender: MessageSender,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<Message> {
    const query = `
      INSERT INTO messages (conversation_id, business_id, sender, content, metadata)
      VALUES ($1, (SELECT business_id FROM conversations WHERE id = $1), $2, $3, $4)
      RETURNING *
    `;
    const res = await pool.query(query, [conversationId, sender, content, JSON.stringify(metadata)]);
    const row = res.rows[0];
    
    return {
      id: row.id,
      conversationId: row.conversation_id,
      sender: row.sender as MessageSender,
      content: row.content,
      metadata: row.metadata,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Retrieve transcript history for a conversation with pagination.
   */
  async getMessages(conversationId: string, businessId: string, options?: { limit?: number; offset?: number }): Promise<{ messages: Message[]; totalCount: number }> {
    const countQuery = `SELECT COUNT(*) as count FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE m.conversation_id = $1 AND c.business_id = $2`;
    const countRes = await pool.query(countQuery, [conversationId, businessId]);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    const msgLimit = options?.limit || 50;
    const msgOffset = options?.offset || 0;

    const query = `
      SELECT m.id, m.conversation_id, m.sender, m.content, m.metadata, m.created_at
      FROM messages m JOIN conversations c ON c.id = m.conversation_id
      WHERE m.conversation_id = $1 AND c.business_id = $2
      ORDER BY m.created_at ASC
      LIMIT $3 OFFSET $4
    `;
    const res = await pool.query(query, [conversationId, businessId, msgLimit, msgOffset]);
    const messages = res.rows.map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      sender: row.sender as MessageSender,
      content: row.content,
      metadata: row.metadata,
      createdAt: new Date(row.created_at),
    }));
    return { messages, totalCount };
  }

  /**
   * Retrieve messages for a customer profile across all their past channels and chats.
   */
  async getMessagesByCustomer(customerId: string, businessId: string, limit: number = 50): Promise<Message[]> {
    const query = `
      SELECT m.id, m.conversation_id, m.sender, m.content, m.metadata, m.created_at
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.customer_id = $1 AND c.business_id = $2
      ORDER BY m.created_at ASC
      LIMIT $3
    `;
    const res = await pool.query(query, [customerId, businessId, limit]);
    return res.rows.map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      sender: row.sender as MessageSender,
      content: row.content,
      metadata: row.metadata,
      createdAt: new Date(row.created_at),
    }));
  }

  async findActiveByInactivity(timeoutMinutes: number): Promise<{ id: string; customerId: string; businessId: string; lastMessageAt: Date }[]> {
    const query = `
      SELECT c.id, c.customer_id, c.business_id, MAX(m.created_at) as last_message_at
      FROM conversations c
      JOIN messages m ON m.conversation_id = c.id
      WHERE c.status = 'active'
      GROUP BY c.id, c.customer_id, c.business_id
      HAVING MAX(m.created_at) < NOW() - INTERVAL '1 minute' * $1
      ORDER BY last_message_at ASC
    `;
    const res = await pool.query(query, [timeoutMinutes]);
    return res.rows.map(r => ({
      id: r.id,
      customerId: r.customer_id,
      businessId: r.business_id,
      lastMessageAt: new Date(r.last_message_at),
    }));
  }

  async findById(id: string, businessId: string): Promise<Conversation | null> {
    const query = `
      SELECT id, customer_id, business_id, status, channel_type, ownership_status, human_owner_id, escalated_at, assigned_at, created_at, updated_at
      FROM conversations
      WHERE id = $1 AND business_id = $2
    `;
    const res = await pool.query(query, [id, businessId]);
    if (res.rows.length === 0) return null;
    return this.mapToConversationEntity(res.rows[0]);
  }

  async updateOwnershipStatus(
    id: string,
    businessId: string,
    ownershipStatus: ConversationOwnershipStatus,
    humanOwnerId?: string
  ): Promise<Conversation> {
    const now = new Date();
    const updates: string[] = ['ownership_status = $3', 'updated_at = $4'];
    const params: any[] = [id, businessId, ownershipStatus, now];
    let paramIdx = 5;

    if (ownershipStatus === 'human_pending') {
      updates.push('escalated_at = $5');
      params.push(now);
      paramIdx++;
    } else if (ownershipStatus === 'human_active' && humanOwnerId) {
      updates.push('human_owner_id = $5', 'assigned_at = $6');
      params.push(humanOwnerId, now);
      paramIdx += 2;
    } else if (ownershipStatus === 'returned_to_ai') {
      updates.push('human_owner_id = NULL');
    }

    const query = `
      UPDATE conversations
      SET ${updates.join(', ')}
      WHERE id = $1 AND business_id = $2
      RETURNING *
    `;
    const res = await pool.query(query, params);
    return this.mapToConversationEntity(res.rows[0]);
  }

  async findByOwnershipStatus(
    businessId: string,
    ownershipStatus: ConversationOwnershipStatus,
    pagination?: { page?: number; limit?: number }
  ): Promise<{ conversations: Conversation[]; totalCount: number }> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 25;
    const offset = (page - 1) * limit;

    const query = `
      SELECT c.id, c.customer_id, c.business_id, c.status, c.channel_type,
        c.ownership_status, c.human_owner_id, c.escalated_at, c.assigned_at, c.created_at, c.updated_at,
        cust.name AS customer_name, cust.phone AS customer_phone,
        lm.last_message, lm.last_message_at,
        COUNT(*) OVER() AS total_count
      FROM conversations c
      LEFT JOIN customers cust ON cust.id = c.customer_id
      LEFT JOIN LATERAL (
        SELECT content AS last_message, created_at AS last_message_at
        FROM messages WHERE conversation_id = c.id
        ORDER BY created_at DESC LIMIT 1
      ) lm ON true
      WHERE c.business_id = $1 AND c.status = 'active' AND c.ownership_status = $2
      ORDER BY c.escalated_at DESC NULLS LAST, lm.last_message_at DESC NULLS LAST
      LIMIT $3 OFFSET $4
    `;
    const res = await pool.query(query, [businessId, ownershipStatus, limit, offset]);

    if (res.rows.length === 0) {
      return { conversations: [], totalCount: 0 };
    }

    const totalCount = parseInt(res.rows[0].total_count, 10);
    const conversations = res.rows.map(row => ({
      ...this.mapToConversationEntity(row),
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : null,
    }));

    return { conversations, totalCount };
  }

  async getInboxConversations(
    businessId: string,
    filters?: { ownershipStatus?: ConversationOwnershipStatus; search?: string },
    pagination?: { page?: number; limit?: number }
  ): Promise<{ conversations: any[]; totalCount: number }> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 25;
    const offset = (page - 1) * limit;
    const params: any[] = [businessId];
    let paramIdx = 2;
    const conditions: string[] = ['c.business_id = $1', "c.status = 'active'"];

    if (filters?.ownershipStatus) {
      conditions.push(`c.ownership_status = $${paramIdx}`);
      params.push(filters.ownershipStatus);
      paramIdx++;
    } else {
      conditions.push(`c.ownership_status IN ('human_pending', 'human_active', 'returned_to_ai')`);
    }

    if (filters?.search) {
      conditions.push(`(cust.name ILIKE $${paramIdx} OR cust.phone ILIKE $${paramIdx})`);
      params.push(`%${filters.search}%`);
      paramIdx++;
    }

    const query = `
      SELECT c.id, c.customer_id, c.business_id, c.status, c.channel_type,
        c.ownership_status, c.human_owner_id, c.escalated_at, c.assigned_at, c.created_at, c.updated_at,
        cust.name AS customer_name, cust.phone AS customer_phone,
        sp.full_name AS owner_name,
        lm.last_message, lm.last_message_at,
        e.reason AS escalation_reason, e.id AS escalation_id,
        COUNT(*) OVER() AS total_count
      FROM conversations c
      LEFT JOIN customers cust ON cust.id = c.customer_id
      LEFT JOIN staff_profiles sp ON sp.user_id = c.human_owner_id AND sp.business_id = c.business_id
      LEFT JOIN LATERAL (
        SELECT content AS last_message, created_at AS last_message_at
        FROM messages WHERE conversation_id = c.id
        ORDER BY created_at DESC LIMIT 1
      ) lm ON true
      LEFT JOIN LATERAL (
        SELECT id, reason FROM escalations
        WHERE conversation_id = c.id AND status = 'pending'
        ORDER BY created_at DESC LIMIT 1
      ) e ON true
      WHERE ${conditions.join(' AND ')}
      ORDER BY
        CASE c.ownership_status
          WHEN 'human_pending' THEN 0
          WHEN 'human_active' THEN 1
          WHEN 'returned_to_ai' THEN 2
        END,
        c.escalated_at DESC NULLS LAST,
        lm.last_message_at DESC NULLS LAST
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    params.push(limit, offset);

    const res = await pool.query(query, params);

    if (res.rows.length === 0) {
      return { conversations: [], totalCount: 0 };
    }

    const totalCount = parseInt(res.rows[0].total_count, 10);
    const conversations = res.rows.map(row => ({
      id: row.id,
      customerId: row.customer_id,
      businessId: row.business_id,
      status: row.status,
      channelType: row.channel_type,
      ownershipStatus: row.ownership_status,
      humanOwnerId: row.human_owner_id,
      escalatedAt: row.escalated_at ? new Date(row.escalated_at) : null,
      assignedAt: row.assigned_at ? new Date(row.assigned_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      ownerName: row.owner_name,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : null,
      escalationReason: row.escalation_reason,
      escalationId: row.escalation_id,
    }));

    return { conversations, totalCount };
  }

  async getInboxCounts(businessId: string): Promise<{ humanPending: number; humanActive: number }> {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE ownership_status = 'human_pending')::int AS human_pending,
        COUNT(*) FILTER (WHERE ownership_status = 'human_active')::int AS human_active
      FROM conversations
      WHERE business_id = $1 AND status = 'active'
    `;
    const res = await pool.query(query, [businessId]);
    return {
      humanPending: res.rows[0].human_pending,
      humanActive: res.rows[0].human_active,
    };
  }

  private mapToConversationEntity(row: any): Conversation {
    return {
      id: row.id,
      customerId: row.customer_id,
      businessId: row.business_id,
      status: row.status as 'active' | 'closed',
      channelType: row.channel_type as ChannelType,
      ownershipStatus: row.ownership_status as ConversationOwnershipStatus,
      humanOwnerId: row.human_owner_id || null,
      escalatedAt: row.escalated_at ? new Date(row.escalated_at) : null,
      assignedAt: row.assigned_at ? new Date(row.assigned_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
export default ConversationRepository;
