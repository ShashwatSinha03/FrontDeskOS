import { DemoEventBus } from '../engine/demo-event-bus';
import type { Conversation, DemoMessage } from '../engine/types';
import { DemoStore } from './store-types';

export class ConversationStore extends DemoStore {
  conversations: Conversation[] = [];

  constructor(private bus: DemoEventBus) {
    super();
    this.bus.on('conversation_updated', ({ conversation }) => {
      const idx = this.conversations.findIndex(c => c.id === conversation.id);
      if (idx >= 0) this.conversations[idx] = conversation;
      else this.conversations.push(conversation);
      this.notify();
    });
    this.bus.on('message_sent', ({ conversationId, content, role }) => {
      const conv = this.conversations.find(c => c.id === conversationId);
      if (conv) {
        conv.messages.push({ id: crypto.randomUUID(), role, content, timestamp: Date.now() });
        this.notify();
      }
    });
  }

  getById(id: string): Conversation | undefined {
    return this.conversations.find(c => c.id === id);
  }

  addMessage(conversationId: string, message: DemoMessage): void {
    const conv = this.conversations.find(c => c.id === conversationId);
    if (conv) {
      conv.messages.push(message);
      this.notify();
    }
  }
}
