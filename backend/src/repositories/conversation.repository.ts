import pool from '../config/db';
import { Conversation, Message, MessageSender, ChannelType } from '../types';

export class ConversationRepository {
  /**
   * Find an active conversation for a customer.
   */
  async findActiveByCustomer(customerId: string, businessId: string): Promise<Conversation | null> {
    const query = `
      SELECT id, customer_id, business_id, status, channel_type, created_at, updated_at
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
      INSERT INTO conversations (customer_id, business_id, status, channel_type)
      VALUES ($1, $2, 'active', $3)
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
      SELECT id, customer_id, business_id, status, channel_type, created_at, updated_at
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

  private mapToConversationEntity(row: any): Conversation {
    return {
      id: row.id,
      customerId: row.customer_id,
      businessId: row.business_id,
      status: row.status as 'active' | 'closed',
      channelType: row.channel_type as ChannelType,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
export default ConversationRepository;
