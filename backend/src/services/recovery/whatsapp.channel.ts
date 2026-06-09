import { RecoveryChannel } from './channel.interface';

export class WhatsAppChannel implements RecoveryChannel {
  name = 'whatsapp';

  async send(_params: {
    businessId: string;
    customerId: string;
    conversationId?: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<{ sent: boolean; externalId?: string }> {
    throw new Error('WhatsApp channel not yet implemented. Integrate with WhatsApp Business API.');
  }
}
