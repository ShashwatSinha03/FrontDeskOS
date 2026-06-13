export interface SendResult {
  success: boolean;
  externalId?: string;
  providerMessage?: string;
}

export interface MediaInput {
  url: string;
  mimeType: string;
  filename?: string;
}

export interface ChannelInfo {
  type: string;
  displayName: string;
  supportsMedia: boolean;
  supportsReadReceipts: boolean;
  supportsTemplates: boolean;
  configuration: Record<string, any>;
}

export interface ChannelAdapter {
  readonly channelType: string;

  sendMessage(params: {
    businessId: string;
    customerId: string;
    conversationId: string;
    messageId: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<SendResult>;

  sendMedia(params: {
    businessId: string;
    customerId: string;
    conversationId: string;
    messageId: string;
    media: MediaInput;
    caption?: string;
    metadata?: Record<string, any>;
  }): Promise<SendResult>;

  markRead(params: {
    businessId: string;
    customerId: string;
    conversationId: string;
    messageId: string;
    externalMessageId?: string;
  }): Promise<SendResult>;

  getChannelInfo(businessId?: string): Promise<ChannelInfo>;
}
