import pool from '../config/db';
import { Conversation, Message, MessageSender, ChannelType } from '../types';

export class ConversationRepository {
  /**
   * Find an active conversation for a customer.
   */
  async findActiveByCustomer(customerId: string): Promise<Conversation | null> {
    const query = `
      SELECT id, customer_id, business_id, status, channel_type, created_at, updated_at
      FROM conversations
      WHERE customer_id = $1 AND status = 'active'
    `;
    const res = await pool.query(query, [customerId]);
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
   * Close a conversation session.
   */
  async close(id: string): Promise<void> {
    const query = `
      UPDATE conversations
      SET status = 'closed', updated_at = NOW()
      WHERE id = $1
    `;
    await pool.query(query, [id]);
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
      INSERT INTO messages (conversation_id, sender, content, metadata)
      VALUES ($1, $2, $3, $4)
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
  async getMessages(conversationId: string, options?: { limit?: number; offset?: number }): Promise<{ messages: Message[]; totalCount: number }> {
    const countQuery = `SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1`;
    const countRes = await pool.query(countQuery, [conversationId]);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    const msgLimit = options?.limit || 50;
    const msgOffset = options?.offset || 0;

    const query = `
      SELECT id, conversation_id, sender, content, metadata, created_at
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
      LIMIT $2 OFFSET $3
    `;
    const res = await pool.query(query, [conversationId, msgLimit, msgOffset]);
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
  async getMessagesByCustomer(customerId: string, limit: number = 50): Promise<Message[]> {
    const query = `
      SELECT m.id, m.conversation_id, m.sender, m.content, m.metadata, m.created_at
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.customer_id = $1
      ORDER BY m.created_at ASC
      LIMIT $2
    `;
    const res = await pool.query(query, [customerId, limit]);
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
