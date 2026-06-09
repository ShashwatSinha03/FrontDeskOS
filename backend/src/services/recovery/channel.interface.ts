export interface RecoveryChannel {
  name: string;
  send(params: {
    businessId: string;
    customerId: string;
    conversationId?: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<{ sent: boolean; externalId?: string }>;
}
