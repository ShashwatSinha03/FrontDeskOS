import pool from '../config/db';
import { MessageDelivery, DeliveryStatus } from '../types';

export class MessageDeliveryRepository {
  async createPending(params: {
    messageId: string;
    conversationId: string;
    businessId: string;
    channelType: string;
    provider: string;
  }): Promise<MessageDelivery> {
    const query = `
      INSERT INTO message_deliveries (message_id, conversation_id, business_id, channel_type, delivery_status, provider)
      VALUES ($1, $2, $3, $4, 'pending', $5)
      RETURNING id, message_id, conversation_id, business_id, channel_type, delivery_status, provider, provider_message_id, failure_reason, created_at, updated_at
    `;
    const res = await pool.query(query, [
      params.messageId,
      params.conversationId,
      params.businessId,
      params.channelType,
      params.provider,
    ]);
    return this.mapToEntity(res.rows[0]);
  }

  async markSent(id: string, businessId: string, providerMessageId: string): Promise<MessageDelivery> {
    const query = `
      UPDATE message_deliveries
      SET delivery_status = 'sent', provider_message_id = $1, updated_at = NOW()
      WHERE id = $2 AND business_id = $3
      RETURNING id, message_id, conversation_id, business_id, channel_type, delivery_status, provider, provider_message_id, failure_reason, created_at, updated_at
    `;
    const res = await pool.query(query, [providerMessageId, id, businessId]);
    if (res.rows.length === 0) throw new Error('Delivery record not found');
    return this.mapToEntity(res.rows[0]);
  }

  async markDelivered(id: string, businessId: string): Promise<MessageDelivery> {
    const query = `
      UPDATE message_deliveries
      SET delivery_status = 'delivered', updated_at = NOW()
      WHERE id = $1 AND business_id = $2
      RETURNING id, message_id, conversation_id, business_id, channel_type, delivery_status, provider, provider_message_id, failure_reason, created_at, updated_at
    `;
    const res = await pool.query(query, [id, businessId]);
    if (res.rows.length === 0) throw new Error('Delivery record not found');
    return this.mapToEntity(res.rows[0]);
  }

  async markFailed(id: string, businessId: string, failureReason: string): Promise<MessageDelivery> {
    const query = `
      UPDATE message_deliveries
      SET delivery_status = 'failed', failure_reason = $1, updated_at = NOW()
      WHERE id = $2 AND business_id = $3
      RETURNING id, message_id, conversation_id, business_id, channel_type, delivery_status, provider, provider_message_id, failure_reason, created_at, updated_at
    `;
    const res = await pool.query(query, [failureReason, id, businessId]);
    if (res.rows.length === 0) throw new Error('Delivery record not found');
    return this.mapToEntity(res.rows[0]);
  }

  async getByMessage(messageId: string, businessId: string): Promise<MessageDelivery[]> {
    const query = `
      SELECT id, message_id, conversation_id, business_id, channel_type, delivery_status, provider, provider_message_id, failure_reason, created_at, updated_at
      FROM message_deliveries
      WHERE message_id = $1 AND business_id = $2
      ORDER BY created_at DESC
    `;
    const res = await pool.query(query, [messageId, businessId]);
    return res.rows.map(r => this.mapToEntity(r));
  }

  async getConversationDeliveries(conversationId: string, businessId: string): Promise<MessageDelivery[]> {
    const query = `
      SELECT id, message_id, conversation_id, business_id, channel_type, delivery_status, provider, provider_message_id, failure_reason, created_at, updated_at
      FROM message_deliveries
      WHERE conversation_id = $1 AND business_id = $2
      ORDER BY created_at DESC
    `;
    const res = await pool.query(query, [conversationId, businessId]);
    return res.rows.map(r => this.mapToEntity(r));
  }

  async countByStatus(businessId: string, status: DeliveryStatus): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM message_deliveries
      WHERE business_id = $1 AND delivery_status = $2
    `;
    const res = await pool.query(query, [businessId, status]);
    return parseInt(res.rows[0].count, 10);
  }

  async countTotal(businessId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM message_deliveries
      WHERE business_id = $1
    `;
    const res = await pool.query(query, [businessId]);
    return parseInt(res.rows[0].count, 10);
  }

  async getDeliveryRate(businessId: string): Promise<{ sent: number; failed: number; total: number; rate: number }> {
    const total = await this.countTotal(businessId);
    if (total === 0) return { sent: 0, failed: 0, total: 0, rate: 0 };
    const sent = await this.countByStatus(businessId, 'sent');
    const delivered = await this.countByStatus(businessId, 'delivered');
    const failed = await this.countByStatus(businessId, 'failed');
    const success = sent + delivered;
    return { sent, failed, total, rate: Math.round((success / total) * 100) };
  }

  async getPendingDeliveries(businessId: string, limit: number = 50): Promise<MessageDelivery[]> {
    const query = `
      SELECT id, message_id, conversation_id, business_id, channel_type, delivery_status, provider, provider_message_id, failure_reason, created_at, updated_at
      FROM message_deliveries
      WHERE business_id = $1 AND delivery_status = 'pending'
      ORDER BY created_at ASC
      LIMIT $2
    `;
    const res = await pool.query(query, [businessId, limit]);
    return res.rows.map(r => this.mapToEntity(r));
  }

  private mapToEntity(row: any): MessageDelivery {
    return {
      id: row.id,
      messageId: row.message_id,
      conversationId: row.conversation_id,
      businessId: row.business_id,
      channelType: row.channel_type,
      deliveryStatus: row.delivery_status,
      provider: row.provider,
      providerMessageId: row.provider_message_id || null,
      failureReason: row.failure_reason || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
