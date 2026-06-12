import { 
  followUpRepository, 
  customerRepository, 
  conversationRepository 
} from '../repositories';
import { LLMProviderFactory } from './llm/provider.factory';
import { FollowUp, FollowUpType } from '../types';

export class FollowUpService {
  /**
   * Schedule the initial re-engagement follow-up.
   * Typically triggered after a short period of conversation inactivity (e.g. 10-15 minutes).
   */
  async scheduleReEngagement(customerId: string, businessId: string): Promise<void> {
    // Cancel existing pending sequences first
    await followUpRepository.cancelPending(customerId, businessId);

    const scheduledTime = new Date();
    scheduledTime.setMinutes(scheduledTime.getMinutes() + 15); // 15 minutes inactivity trigger

    await followUpRepository.schedule({
      customerId,
      businessId,
      type: 're_engagement',
      scheduledAt: scheduledTime
    });

    // Update customer lifecycle state to 'Follow-Up Pending'
    await customerRepository.updateLifecycleState(customerId, 'Follow-Up Pending', 'system:inactivity');
  }

  /**
   * Process all follow-ups that are currently due.
   * Designed to be invoked periodically by an external cron schedule or web endpoint.
   */
  async processDueFollowUps(): Promise<number> {
    const now = new Date();
    const dueList = await followUpRepository.findDueToProcess(now);
    
    if (dueList.length === 0) return 0;

    for (const followUp of dueList) {
      await this.executeSingleFollowUp(followUp);
    }

    return dueList.length;
  }

  /**
   * Executes a single follow-up task.
   * Formulates follow-up content using the LLM abstraction, logs the message,
   * updates the customer lifecycle, and schedules subsequent check-ins.
   */
  private async executeSingleFollowUp(followUp: FollowUp): Promise<void> {
    try {
      // 1. Check if the customer is still in a follow-up state (verify no other bookings happened)
      const customer = await customerRepository.findById(followUp.customerId, followUp.businessId);
      if (!customer || customer.lifecycleState === 'Booked' || customer.lifecycleState === 'Customer') {
        // Cancel if customer is already booked
        await followUpRepository.cancelPending(followUp.customerId, followUp.businessId, followUp.type);
        return;
      }

      // 2. Resolve active conversation session
      let conversation = await conversationRepository.findActiveByCustomer(followUp.customerId, followUp.businessId);
      if (!conversation) {
        conversation = await conversationRepository.create(
          followUp.customerId,
          followUp.businessId,
          'web_chat' // default fallback channel
        );
      }

      // 3. Generate personalized re-engagement message using LLM
      const { messages } = await conversationRepository.getMessages(conversation.id, followUp.businessId);
      const conversationHistory = messages.map(m => `${m.sender}: ${m.content}`).join('\n');

      const provider = LLMProviderFactory.getProvider();
      const prompt = `
You are a helpful front-desk assistant follow-up engine.
Here is the chat history between the clinic assistant and the patient:
${conversationHistory}

This patient has been inactive for some time. We are performing a follow-up check-in.
Follow-up Type: ${followUp.type} (re_engagement = 15 mins, day_1 = 24 hours, day_3 = 72 hours)

Write a short, professional, and friendly 1-2 sentence re-engagement message.
Do NOT give medical advice. If they had scheduling concerns, offer to find a slot.
Keep it casual, supportive, and matching the business tone.
Response:`;

      const followUpText = await provider.chat([
        { role: 'system', content: 'You are an AI follow-up dispatcher.' },
        { role: 'user', content: prompt }
      ]);

      // 4. Log the follow-up message in conversation history
      await conversationRepository.addMessage(
        conversation.id,
        'system',
        `[Follow-Up Sent: ${followUp.type}] ${followUpText}`,
        { followUpId: followUp.id, followUpType: followUp.type }
      );

      // 5. Update follow-up record
      await followUpRepository.markSent(followUp.id, followUp.businessId);

      // 6. State transitions & Scheduling subsequent sequences
      if (followUp.type === 're_engagement') {
        // Schedule Day 1 check-in
        const day1Time = new Date();
        day1Time.setHours(day1Time.getHours() + 24); // 24 hours later
        await followUpRepository.schedule({
          customerId: followUp.customerId,
          businessId: followUp.businessId,
          type: 'day_1',
          scheduledAt: day1Time
        });
      } else if (followUp.type === 'day_1') {
        // Schedule Day 3 check-in
        const day3Time = new Date();
        day3Time.setHours(day3Time.getHours() + 48); // 48 hours after Day 1 (total 72 hours)
        await followUpRepository.schedule({
          customerId: followUp.customerId,
          businessId: followUp.businessId,
          type: 'day_3',
          scheduledAt: day3Time
        });
      } else if (followUp.type === 'day_3') {
        // Final state change: Mark customer as 'Lost' after no response to Day 3 follow-up
        await customerRepository.updateLifecycleState(followUp.customerId, 'Lost', 'system:no_response_to_day_3_followup');
      }
    } catch (error) {
      console.error(`Error executing follow-up ${followUp.id}:`, error);
    }
  }
}

export const followUpService = new FollowUpService();
export default followUpService;
