import { ChannelAdapter, ChannelInfo, SendResult } from './channel-adapter.interface';
import { logger } from '../../lib/logger';

export class WebChatAdapter implements ChannelAdapter {
  readonly channelType = 'web_chat';

  async sendMessage(params: {
    businessId: string;
    customerId: string;
    conversationId: string;
    messageId: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<SendResult> {
    logger.debug('WebChatAdapter.sendMessage — no-op (delivery via HTTP response)', {
      channelType: 'web_chat',
      messageId: params.messageId,
      conversationId: params.conversationId,
    });
    return { success: true, externalId: params.messageId };
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
    return { success: true };
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
      type: 'web_chat',
      displayName: 'Website Chat',
      supportsMedia: false,
      supportsReadReceipts: false,
      supportsTemplates: false,
      configuration: {},
    };
  }
}
