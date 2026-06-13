import { businessChannelRepository } from '../../repositories';
import { channelRegistry } from './channel-registry';
import { ChannelType } from '../../types';
import { logger } from '../../lib/logger';

export class ChannelService {
  async getChannels(businessId: string) {
    return businessChannelRepository.getChannels(businessId);
  }

  async getChannel(businessId: string, channelType: string) {
    return businessChannelRepository.getChannel(businessId, channelType);
  }

  async enableChannel(businessId: string, channelType: string) {
    return businessChannelRepository.enableChannel(businessId, channelType);
  }

  async disableChannel(businessId: string, channelType: string) {
    const enabledCount = await businessChannelRepository.countEnabledChannels(businessId);
    if (enabledCount <= 1) {
      throw new Error('Cannot disable the only active channel. At least one channel must remain enabled.');
    }
    return businessChannelRepository.disableChannel(businessId, channelType);
  }

  async updateChannel(
    businessId: string,
    channelType: string,
    config: { enabled?: boolean; provider?: string; configJson?: Record<string, any> }
  ) {
    if (config.enabled === false) {
      const enabledCount = await businessChannelRepository.countEnabledChannels(businessId);
      const current = await businessChannelRepository.getChannel(businessId, channelType);
      if (enabledCount <= 1 && current?.enabled) {
        throw new Error('Cannot disable the only active channel. At least one channel must remain enabled.');
      }
    }

    if (config.provider) {
      this.validateProvider(channelType, config.provider);
    }

    return businessChannelRepository.updateChannelConfig(businessId, channelType, config);
  }

  async isChannelEnabled(businessId: string, channelType: string): Promise<boolean> {
    const channel = await businessChannelRepository.getChannel(businessId, channelType);
    return channel?.enabled ?? false;
  }

  async assertChannelEnabled(businessId: string, channelType: string): Promise<void> {
    const enabled = await this.isChannelEnabled(businessId, channelType);
    if (!enabled) {
      throw new Error(`Channel '${channelType}' is not enabled for business '${businessId}'`);
    }
  }

  async canReceiveMessages(businessId: string, channelType: string): Promise<boolean> {
    const channel = await businessChannelRepository.getChannel(businessId, channelType);
    if (!channel?.enabled) return false;
    return channelRegistry.hasAdapter(channelType);
  }

  async canSendMessages(businessId: string, channelType: string): Promise<boolean> {
    const channel = await businessChannelRepository.getChannel(businessId, channelType);
    if (!channel?.enabled) return false;
    return channelRegistry.hasAdapter(channelType);
  }

  async getAdapterForChannel(businessId: string, channelType: ChannelType) {
    await this.assertChannelEnabled(businessId, channelType);
    return channelRegistry.getAdapterForBusiness(channelType, businessId);
  }

  private validateProvider(channelType: string, provider: string): void {
    const VALID_PROVIDERS: Record<string, string[]> = {
      web_chat: ['internal'],
      whatsapp: ['internal', 'twilio', 'meta'],
      voice: ['internal', 'twilio'],
    };

    const allowed = VALID_PROVIDERS[channelType];
    if (!allowed) {
      throw new Error(`Unknown channel type: '${channelType}'`);
    }
    if (!allowed.includes(provider)) {
      throw new Error(`Provider '${provider}' is not supported for channel type '${channelType}'. Allowed: ${allowed.join(', ')}`);
    }
  }
}

export const channelService = new ChannelService();
