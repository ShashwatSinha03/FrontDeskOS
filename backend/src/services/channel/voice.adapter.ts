import { ChannelAdapter, ChannelInfo, SendResult } from './channel-adapter.interface';

export class VoiceAdapter implements ChannelAdapter {
  readonly channelType = 'voice';

  async sendMessage(_params: {
    businessId: string;
    customerId: string;
    conversationId: string;
    messageId: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<SendResult> {
    throw new Error('Voice adapter not yet implemented. Integrate with Twilio Voice API or similar.');
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
    throw new Error('Voice adapter not yet implemented. Media support requires Twilio Voice API.');
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
      type: 'voice',
      displayName: 'Phone Call',
      supportsMedia: false,
      supportsReadReceipts: false,
      supportsTemplates: false,
      configuration: {},
    };
  }
}
