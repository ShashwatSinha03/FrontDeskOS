import { RecoveryChannel } from './channel.interface';
import { conversationRepository } from '../../repositories';

export class WebChatChannel implements RecoveryChannel {
  name = 'web_chat';

  async send(params: {
    businessId: string;
    customerId: string;
    conversationId?: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<{ sent: boolean; externalId?: string }> {
    let conversationId = params.conversationId;
    if (!conversationId) {
      const conv = await conversationRepository.findActiveByCustomer(params.customerId);
      if (!conv) {
        const newConv = await conversationRepository.create(params.customerId, params.businessId, 'web_chat');
        conversationId = newConv.id;
      } else {
        conversationId = conv.id;
      }
    }

    const msg = await conversationRepository.addMessage(
      conversationId,
      'agent',
      params.content,
      { recovery: true, ...params.metadata }
    );

    return { sent: true, externalId: msg.id };
  }
}
