import { ChannelAdapter, ChannelInfo, SendResult } from './channel-adapter.interface';

export class SmsAdapter implements ChannelAdapter {
  readonly channelType = 'sms';

  async sendMessage(_params: {
    businessId: string;
    customerId: string;
    conversationId: string;
    messageId: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<SendResult> {
    throw new Error('SMS adapter not yet implemented. Integrate with Twilio SMS API or similar.');
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
    throw new Error('SMS adapter not yet implemented. MMS support requires Twilio SMS API.');
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
      type: 'sms',
      displayName: 'SMS',
      supportsMedia: true,
      supportsReadReceipts: false,
      supportsTemplates: false,
      configuration: {},
    };
  }
}
