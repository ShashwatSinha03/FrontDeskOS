import { RecoveryChannel } from './channel.interface';

export class VoiceChannel implements RecoveryChannel {
  name = 'voice';

  async send(_params: {
    businessId: string;
    customerId: string;
    conversationId?: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<{ sent: boolean; externalId?: string }> {
    throw new Error('Voice channel not yet implemented. Integrate with Twilio Voice API.');
  }
}
