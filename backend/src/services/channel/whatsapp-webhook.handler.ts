import { Request } from 'express';
import twilio from 'twilio';
import pool from '../../config/db';
import { customerRepository, conversationRepository } from '../../repositories';
import { chatService } from '../chat.service';
import { messageDeliveryRepository } from '../../repositories';
import { logger } from '../../lib/logger';

export class WhatsAppWebhookHandler {
  async handleInbound(req: Request): Promise<void> {
    const fromNumber = req.body.From as string | undefined;
    const toNumber = req.body.To as string | undefined;
    const body = (req.body.Body as string || '').trim();

    if (!fromNumber || !toNumber) {
      logger.warn('WhatsApp webhook missing From or To', { body: req.body });
      return;
    }

    if (!body) {
      logger.info('Ignoring empty WhatsApp message', { from: fromNumber });
      return;
    }

    const business = await this.resolveBusinessByNumber(toNumber);
    if (!business) {
      logger.warn('No business found for WhatsApp number', { toNumber });
      return;
    }

    const businessId = business.businessId;

    const channelEnabled = await this.isChannelEnabled(businessId);
    if (!channelEnabled) {
      logger.warn('WhatsApp channel disabled for business', { businessId });
      return;
    }

    const channelIdentity = fromNumber.replace('whatsapp:', '');

    try {
      await chatService.handleIncomingMessage({
        businessId,
        channelType: 'whatsapp',
        channelIdentity,
        content: body,
        customerPhone: channelIdentity,
      });

      logger.info('WhatsApp inbound message processed', {
        businessId,
        from: channelIdentity,
      });
    } catch (err) {
      logger.error('Failed to process WhatsApp inbound message', {
        businessId,
        from: channelIdentity,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async handleStatusCallback(req: Request): Promise<void> {
    const messageSid = req.body.MessageSid as string | undefined;
    const messageStatus = req.body.MessageStatus as string | undefined;
    const businessId = req.query.businessId as string | undefined;
    const messageId = req.query.messageId as string | undefined;

    if (!messageSid || !messageStatus || !businessId) {
      logger.warn('Status callback missing required fields', { messageSid, messageStatus, businessId });
      return;
    }

    const deliveryStatus = this.mapTwilioStatus(messageStatus);
    if (!deliveryStatus) {
      return;
    }

    try {
      if (messageId) {
        const deliveries = await messageDeliveryRepository.getByMessage(messageId, businessId);
        const delivery = deliveries.find(d => d.providerMessageId === messageSid);
        if (delivery) {
          if (deliveryStatus === 'sent' && delivery.deliveryStatus === 'pending') {
            await messageDeliveryRepository.markSent(delivery.id, businessId, messageSid);
          } else if (deliveryStatus === 'delivered') {
            await messageDeliveryRepository.markDelivered(delivery.id, businessId);
          } else if (deliveryStatus === 'failed') {
            const failureReason = req.body.ErrorMessage || 'Delivery failed per Twilio status callback';
            await messageDeliveryRepository.markFailed(delivery.id, businessId, failureReason);
          }
        }
      } else {
        const query = `
          UPDATE message_deliveries
          SET delivery_status = $1, provider_message_id = $2, updated_at = NOW()
          WHERE provider_message_id = $3 AND business_id = $4
        `;
        await pool.query(query, [deliveryStatus, messageSid, messageSid, businessId]);
      }

      logger.info('WhatsApp status callback processed', {
        businessId,
        messageSid,
        messageStatus,
        deliveryStatus,
      });
    } catch (err) {
      logger.error('Failed to process status callback', {
        businessId,
        messageSid,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async resolveBusinessByNumber(toNumber: string): Promise<{ businessId: string } | null> {
    const cleanNumber = toNumber.replace('whatsapp:', '');
    const query = `
      SELECT business_id FROM business_channels
      WHERE channel_type = 'whatsapp'
        AND enabled = true
        AND config_json->>'whatsappNumber' = $1
      LIMIT 1
    `;
    const res = await pool.query(query, [cleanNumber]);
    if (res.rows.length === 0) return null;
    return { businessId: res.rows[0].business_id };
  }

  private async isChannelEnabled(businessId: string): Promise<boolean> {
    const query = `
      SELECT enabled FROM business_channels
      WHERE business_id = $1 AND channel_type = 'whatsapp'
      LIMIT 1
    `;
    const res = await pool.query(query, [businessId]);
    return res.rows.length > 0 && res.rows[0].enabled;
  }

  private mapTwilioStatus(status: string): string | null {
    const map: Record<string, string> = {
      queued: 'pending',
      sent: 'sent',
      delivered: 'delivered',
      failed: 'failed',
      undelivered: 'failed',
    };
    return map[status] || null;
  }
}

export const whatsappWebhookHandler = new WhatsAppWebhookHandler();
