import { ChannelAdapter } from './channel-adapter.interface';
import { WebChatAdapter } from './webchat.adapter';
import { WhatsAppAdapter } from './whatsapp.adapter';
import { VoiceAdapter } from './voice.adapter';
import { SmsAdapter } from './sms.adapter';
import { ChannelType } from '../../types';
import { logger } from '../../lib/logger';

export class ChannelRegistry {
  private adapters: Map<string, ChannelAdapter> = new Map();

  constructor() {
    this.register(new WebChatAdapter());
    this.register(new WhatsAppAdapter());
    this.register(new VoiceAdapter());
    this.register(new SmsAdapter());
  }

  register(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.channelType, adapter);
    logger.info('Channel adapter registered', { channelType: adapter.channelType });
  }

  getAdapter(channelType: string): ChannelAdapter {
    const adapter = this.adapters.get(channelType);
    if (!adapter) {
      throw new Error(`No channel adapter registered for type: '${channelType}'`);
    }
    return adapter;
  }

  getAdapterOrNull(channelType: string): ChannelAdapter | null {
    return this.adapters.get(channelType) ?? null;
  }

  hasAdapter(channelType: string): boolean {
    return this.adapters.has(channelType);
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.adapters.keys());
  }

  async getAdapterForBusiness(channelType: ChannelType, businessId?: string): Promise<ChannelAdapter> {
    const adapter = this.adapters.get(channelType);
    if (!adapter) {
      throw new Error(`No channel adapter registered for type: '${channelType}'`);
    }
    return adapter;
  }
}

export const channelRegistry = new ChannelRegistry();
