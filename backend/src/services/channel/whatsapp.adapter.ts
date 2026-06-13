import twilio from 'twilio';
import { ChannelAdapter, ChannelInfo, SendResult } from './channel-adapter.interface';
import { businessChannelRepository } from '../../repositories';
import pool from '../../config/db';
import { logger } from '../../lib/logger';

export class WhatsAppAdapter implements ChannelAdapter {
  readonly channelType = 'whatsapp';

  async sendMessage(params: {
    businessId: string;
    customerId: string;
    conversationId: string;
    messageId: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<SendResult> {
    const channel = await businessChannelRepository.getChannel(params.businessId, 'whatsapp');
    if (!channel) {
      return { success: false, providerMessage: 'WhatsApp channel not configured for this business' };
    }

    const config = channel.configJson || {};
    const accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = config.authToken || process.env.TWILIO_AUTH_TOKEN;
    const whatsappNumber = config.whatsappNumber || process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !whatsappNumber) {
      return { success: false, providerMessage: 'Twilio credentials not configured for WhatsApp channel' };
    }

    const customer = await this.resolveCustomerPhone(params.businessId, params.customerId);
    if (!customer) {
      return { success: false, providerMessage: 'Customer phone number not found' };
    }

    const toNumber = customer.startsWith('whatsapp:') ? customer : `whatsapp:${customer}`;
    const fromNumber = whatsappNumber.startsWith('whatsapp:') ? whatsappNumber : `whatsapp:${whatsappNumber}`;

    try {
      const client = twilio(accountSid, authToken);
      const message = await client.messages.create({
        from: fromNumber,
        to: toNumber,
        body: params.content,
        statusCallback: this.buildStatusCallbackUrl(params.businessId, params.messageId),
      });

      logger.info('WhatsApp message sent via Twilio', {
        channelType: 'whatsapp',
        businessId: params.businessId,
        messageId: params.messageId,
        twilioSid: message.sid,
        status: message.status,
      });

      return { success: true, externalId: message.sid };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Twilio sendMessage failed', {
        channelType: 'whatsapp',
        businessId: params.businessId,
        messageId: params.messageId,
        error: errorMessage,
      });
      return { success: false, providerMessage: errorMessage };
    }
  }

  async sendMedia(_params: {
    businessId: string;
    customerId: string;
    conversationId: string;
    messageId: string;
    media: { url: string; mimeType: string; filename?: string };
    caption?: string;
    metadata?: Record<string, any>;
  }): Promise<SendResult> {
    return { success: false, providerMessage: 'Media not yet supported for WhatsApp' };
  }

  async markRead(_params: {
    businessId: string;
    customerId: string;
    conversationId: string;
    messageId: string;
    externalMessageId?: string;
  }): Promise<SendResult> {
    return { success: true };
  }

  async getChannelInfo(_businessId?: string): Promise<ChannelInfo> {
    return {
      type: 'whatsapp',
      displayName: 'WhatsApp',
      supportsMedia: true,
      supportsReadReceipts: true,
      supportsTemplates: true,
      configuration: {},
    };
  }

  private async resolveCustomerPhone(businessId: string, customerId: string): Promise<string | null> {
    const query = `
      SELECT phone FROM customers WHERE id = $1 AND business_id = $2
    `;
    const res = await pool.query(query, [customerId, businessId]);
    if (res.rows.length === 0 || !res.rows[0].phone) {
      return null;
    }
    return res.rows[0].phone;
  }

  private buildStatusCallbackUrl(businessId: string, messageId: string): string {
    const baseUrl = process.env.WEBHOOK_BASE_URL || process.env.API_URL || 'https://api.nuvoraos.app';
    return `${baseUrl}/api/webhooks/twilio/status?businessId=${businessId}&messageId=${messageId}`;
  }
}
