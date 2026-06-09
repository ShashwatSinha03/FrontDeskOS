import { RecoveryChannel } from './channel.interface';

export class SmsChannel implements RecoveryChannel {
  name = 'sms';

  async send(_params: {
    businessId: string;
    customerId: string;
    conversationId?: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<{ sent: boolean; externalId?: string }> {
    throw new Error('SMS channel not yet implemented. Integrate with Twilio SMS API.');
  }
}
