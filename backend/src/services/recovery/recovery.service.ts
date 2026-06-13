import {
  followUpRepository,
  customerRepository,
  conversationRepository,
  businessRepository,
} from '../../repositories';
import { LLMProviderFactory } from '../llm/provider.factory';
import { RecoveryChannel } from './channel.interface';
import { WebChatChannel } from './webchat.channel';
import { WhatsAppChannel } from './whatsapp.channel';
import { VoiceChannel } from './voice.channel';
import { SmsChannel } from './sms.channel';
import { FollowUp, RecoveryStep, RecoveryConfig, FollowUpTriggerReason } from '../../types';
import pool from '../../config/db';
import { logger } from '../../lib/logger';

export class RecoveryService {
  private channels: Map<string, RecoveryChannel> = new Map();

  constructor() {
    this.registerChannel(new WebChatChannel());
    this.registerChannel(new WhatsAppChannel());
    this.registerChannel(new VoiceChannel());
    this.registerChannel(new SmsChannel());
  }

  registerChannel(channel: RecoveryChannel): void {
    this.channels.set(channel.name, channel);
  }

  async hasPendingRecovery(customerId: string): Promise<boolean> {
    const query = `
      SELECT id FROM follow_ups
      WHERE customer_id = $1 AND status = 'pending'
      LIMIT 1
    `;
    const res = await pool.query(query, [customerId]);
    return res.rows.length > 0;
  }

  async scheduleRecovery(customerId: string, businessId: string, reason: FollowUpTriggerReason = 'inactivity', voiceCallId?: string): Promise<void> {
    const business = await businessRepository.findById(businessId);
    if (!business) throw new Error(`Business '${businessId}' not found`);

    const config = business.appointmentSettings?.recoveryConfig;
    const sequence = config?.sequences?.[reason] || config?.sequences?.['default'] || this.defaultSequence();

    const now = new Date();
    for (const step of sequence) {
      const stepMinutes = step.delayMinutes ?? ((step.delayHours ?? 0) * 60);
      const scheduledAt = new Date(now.getTime() + stepMinutes * 60000);

      const followUp = await followUpRepository.schedule({
        customerId,
        businessId,
        type: step.type,
        channel: step.channel,
        triggerReason: reason,
        scheduledAt,
        voiceCallId: reason === 'missed_call' ? voiceCallId : undefined,
      });
      if (!followUp && reason === 'missed_call') {
        logger.info('Missed call recovery already scheduled, skipping', { route: 'RecoveryService', customerId, businessId, voiceCallId });
        return;
      }
    }
  }

  async processDueRecoveries(): Promise<number> {
    const dueList = await followUpRepository.findDueToProcess(new Date());
    if (dueList.length === 0) return 0;

    let processed = 0;
    for (const followUp of dueList) {
      await this.executeStep(followUp);
      processed++;
    }

    return processed;
  }

  async cancelRecovery(customerId: string, businessId: string): Promise<void> {
    await followUpRepository.cancelPending(customerId, businessId);
  }

  private async executeStep(followUp: FollowUp): Promise<void> {
    try {
      const customer = await customerRepository.findById(followUp.customerId, followUp.businessId);
      if (!customer || ['Booked', 'Customer', 'Lost'].includes(customer.lifecycleState)) {
        await followUpRepository.cancelPending(followUp.customerId, followUp.businessId);
        return;
      }

      const channel = this.channels.get(followUp.channel);
      if (!channel) {
        logger.error('No channel adapter registered — cancelling follow-up', { route: 'RecoveryService', channel: followUp.channel, followUpId: followUp.id, businessId: followUp.businessId, customerId: followUp.customerId });
        await followUpRepository.cancelPending(followUp.customerId, followUp.businessId, followUp.type);
        return;
      }

      const content = await this.generateRecoveryContent(followUp);

      const conversation = await conversationRepository.findActiveByCustomer(followUp.customerId, followUp.businessId)
        || await conversationRepository.create(followUp.customerId, followUp.businessId, 'web_chat');

      await channel.send({
        businessId: followUp.businessId,
        customerId: followUp.customerId,
        conversationId: conversation.id,
        content,
        metadata: { followUpId: followUp.id, type: followUp.type },
      });

      await followUpRepository.markSent(followUp.id, followUp.businessId);

      if (followUp.type === 'day_3') {
        await customerRepository.updateLifecycleState(followUp.customerId, 'Lost', 'system:no_response_to_day_3_followup');
      }
    } catch (error) {
      logger.error('Error executing recovery step — cancelling', { route: 'RecoveryService', followUpId: followUp.id, businessId: followUp.businessId, customerId: followUp.customerId, error: error instanceof Error ? error.message : String(error) });
      await followUpRepository.cancelPending(followUp.customerId, followUp.businessId, followUp.type);
    }
  }

  private async generateRecoveryContent(followUp: FollowUp): Promise<string> {
    const conversation = await conversationRepository.findActiveByCustomer(followUp.customerId, followUp.businessId);
    let history = '';
    if (conversation) {
      const { messages } = await conversationRepository.getMessages(conversation.id, followUp.businessId);
      history = messages.map(m => `${m.sender}: ${m.content}`).join('\n');
    }

    const provider = LLMProviderFactory.getProvider();
    const prompt = `You are a helpful front-desk assistant recovery engine.
${history ? `Chat history:\n${history}\n` : 'No prior chat history.'}
Follow-up type: ${followUp.type} (re_engagement = 15 min, day_1 = 24 hr, day_3 = 72 hr)
Write a short, professional 1-2 sentence re-engagement message. Keep it casual and supportive.`;

    return await provider.chat([
      { role: 'system', content: 'You are an AI recovery dispatcher.' },
      { role: 'user', content: prompt },
    ]);
  }

  private defaultSequence(): RecoveryStep[] {
    return [
      { type: 're_engagement', delayMinutes: 15, channel: 'web_chat' },
      { type: 'day_1', delayHours: 24, channel: 'web_chat' },
      { type: 'day_3', delayHours: 72, channel: 'web_chat' },
    ];
  }
}
