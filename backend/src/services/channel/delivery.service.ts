import { messageDeliveryRepository, businessChannelRepository, channelUsageRepository } from '../../repositories';
import { channelRegistry } from './channel-registry';
import { SendResult } from './channel-adapter.interface';
import { ChannelType, MessageDelivery } from '../../types';
import { estimateChannelCost } from '../llm/cost-estimator.service';
import { logger } from '../../lib/logger';

export class DeliveryService {
  async sendMessage(params: {
    businessId: string;
    customerId: string;
    conversationId: string;
    messageId: string;
    channelType: ChannelType;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    let deliveryRecord: MessageDelivery | undefined;
    try {
      const adapter = channelRegistry.getAdapter(params.channelType);

      const provider = await this.resolveProvider(params.businessId, params.channelType);

      deliveryRecord = await messageDeliveryRepository.createPending({
        messageId: params.messageId,
        conversationId: params.conversationId,
        businessId: params.businessId,
        channelType: params.channelType,
        provider,
      });

      const result: SendResult = await adapter.sendMessage({
        businessId: params.businessId,
        customerId: params.customerId,
        conversationId: params.conversationId,
        messageId: params.messageId,
        content: params.content,
        metadata: params.metadata,
      });

      if (result.success) {
        if (result.externalId) {
          await messageDeliveryRepository.markSent(deliveryRecord.id, params.businessId, result.externalId);
        } else {
          await messageDeliveryRepository.markSent(deliveryRecord.id, params.businessId, 'internal');
        }

        channelUsageRepository.create({
          businessId: params.businessId,
          channelType: params.channelType,
          direction: 'outbound',
          conversationId: params.conversationId,
          customerId: params.customerId,
          messageId: params.messageId,
          estimatedCostUsd: estimateChannelCost(params.channelType),
          metadata: { deliveryId: deliveryRecord.id, externalId: result.externalId },
        }).catch((err) => {
          logger.error('Failed to persist channel usage', {
            route: 'DeliveryService',
            businessId: params.businessId,
            error: err instanceof Error ? err.message : String(err),
          });
        });

        logger.info('Message delivered successfully', {
          route: 'DeliveryService',
          businessId: params.businessId,
          channelType: params.channelType,
          messageId: params.messageId,
          deliveryId: deliveryRecord.id,
          externalId: result.externalId,
        });
      } else {
        await messageDeliveryRepository.markFailed(
          deliveryRecord.id,
          params.businessId,
          result.providerMessage || 'Delivery returned unsuccessful'
        );
        logger.warn('Delivery returned unsuccessful', {
          route: 'DeliveryService',
          businessId: params.businessId,
          channelType: params.channelType,
          messageId: params.messageId,
          deliveryId: deliveryRecord.id,
          reason: result.providerMessage,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Delivery failed with error', {
        route: 'DeliveryService',
        businessId: params.businessId,
        channelType: params.channelType,
        messageId: params.messageId,
        error: errorMessage,
      });

      const deliveryId = deliveryRecord?.id;
      if (deliveryId) {
        await messageDeliveryRepository.markFailed(deliveryId, params.businessId, errorMessage).catch((logErr) => {
          logger.error('Failed to mark delivery as failed', {
            route: 'DeliveryService',
            businessId: params.businessId,
            deliveryId,
            error: logErr instanceof Error ? logErr.message : String(logErr),
          });
        });
      }
    }
  }

  async getDeliveryMetrics(businessId: string) {
    return messageDeliveryRepository.getDeliveryRate(businessId);
  }

  async getPendingDeliveries(businessId: string, limit?: number) {
    return messageDeliveryRepository.getPendingDeliveries(businessId, limit);
  }

  async getFailedDeliveries(businessId: string, limit?: number) {
    return messageDeliveryRepository.getFailedDeliveries(businessId, limit);
  }

  async getDeliveryHealth(businessId: string) {
    return messageDeliveryRepository.getDeliveryHealth(businessId);
  }

  private async resolveProvider(businessId: string, channelType: string): Promise<string> {
    if (channelType === 'web_chat') return 'internal';
    const channel = await businessChannelRepository.getChannel(businessId, channelType).catch(() => null);
    if (!channel) return 'internal';
    if (channel.provider !== 'internal') return channel.provider;
    if (channelType === 'whatsapp' && channel.configJson?.whatsappNumber) return 'twilio';
    return 'internal';
  }
}

export const deliveryService = new DeliveryService();
