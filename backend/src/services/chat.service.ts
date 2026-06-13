/**
 * chat.service.ts
 *
 * Orchestrates the end-to-end lifecycle of an incoming customer message:
 *  1. Resolve (or create) the customer profile using the channel identity
 *  2. Resolve (or create) the active conversation session
 *  3. Persist the customer's message to the transcript
 *  4. Cancel any pending follow-up timers (customer is re-engaged)
 *  5. Load all context needed by the agent (business profile, services, history)
 *  6. Invoke the LangGraph Conversation Agent
 *  7. Apply all side-effects from the agent result (lifecycle state, escalations, etc.)
 *  8. Persist the agent's reply to the transcript
 *  9. Schedule a follow-up if the conversation remains open after a period of inactivity
 */

import {
  customerRepository,
  conversationRepository,
  businessRepository,
  sessionRepository,
} from '../repositories';
import { recoveryService } from './recovery';
import { notificationService } from './notification.service';
import { deliveryService } from './channel/delivery.service';
import { conversationAgent } from '../workflows/agent.graph';
import { ChannelType, Customer, Conversation, Message, AgentResult, ConversationIntent, CustomerLifecycleState } from '../types';
import pool from '../config/db';
import { logger } from '../lib/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Internal type for the agent graph output
// ─────────────────────────────────────────────────────────────────────────────

interface AgentStateOutput {
  intent: ConversationIntent;
  intentConfidence: number;
  reply: string;
  updatedLifecycleState?: CustomerLifecycleState;
  escalationId?: string;
  appointmentId?: string;
  knowledgeRequestId?: string;
  metadata: Record<string, any>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Input / Output Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessageInput {
  businessId: string;
  channelType: ChannelType;
  channelIdentity: string; // session ID, phone, WhatsApp JID, etc.
  content: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  sessionId?: string;
}

export interface ChatResponse {
  conversation: Conversation;
  customer: Customer;
  userMessage: Message;
  replyMessage: Message;
  agentResult: AgentResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// ChatService
// ─────────────────────────────────────────────────────────────────────────────

export class ChatService {
  /**
   * End-to-end handler for an incoming customer message.
   */
  async handleIncomingMessage(input: ChatMessageInput): Promise<ChatResponse> {
    // ── 1. Resolve customer profile ──────────────────────────────────────────
    let customer = await customerRepository.findByChannelIdentity(
      input.channelType,
      input.channelIdentity,
      input.businessId
    );

    if (!customer) {
      customer = await customerRepository.create(
        input.businessId,
        input.customerName || input.channelIdentity,
        input.customerEmail || null,
        input.customerPhone || (input.channelType !== 'web_chat' ? input.channelIdentity : null)
      );
      await customerRepository.linkChannel(customer.id, input.channelType, input.channelIdentity);

      const leadName = customer.name || 'A visitor';
      notificationService.create({
        businessId: input.businessId,
        type: 'lead_captured',
        title: 'New Lead Captured',
        message: `${leadName} submitted an inquiry.`,
        entityType: 'customer',
        entityId: customer.id,
      }).catch((err) => logger.error('Failed to create lead_captured notification', { route: 'ChatService', businessId: input.businessId, customerId: customer?.id, error: err instanceof Error ? err.message : String(err) }));
    } else {
      // Enrich profile with any newly provided details
      const profileUpdates: Partial<Pick<Customer, 'name' | 'email' | 'phone'>> = {};
      if (!customer.name && input.customerName) profileUpdates.name = input.customerName;
      if (!customer.email && input.customerEmail) profileUpdates.email = input.customerEmail;
      if (!customer.phone && input.customerPhone) profileUpdates.phone = input.customerPhone;

      if (Object.keys(profileUpdates).length > 0) {
        await customerRepository.updateProfile(customer.id, input.businessId, profileUpdates);
        customer = { ...customer, ...profileUpdates } as Customer;
      }
    }

    // ── 1b. Link session to customer if sessionId is provided ───────────────
    if (input.sessionId) {
      await sessionRepository.updateCustomer(input.sessionId, input.businessId, customer.id);
    }

    // ── 2. Resolve active conversation session ───────────────────────────────
    let conversation = await conversationRepository.findActiveByCustomer(customer.id, input.businessId);
    if (!conversation) {
      conversation = await conversationRepository.create(
        customer.id,
        input.businessId,
        input.channelType
      );
    }

    // ── 3. Persist customer message ──────────────────────────────────────────
    const userMessage = await conversationRepository.addMessage(
      conversation.id,
      'customer',
      input.content
    );

    // ── 4. Cancel pending recovery (customer re-engaged) ────────────────────
    await recoveryService.cancelRecovery(customer.id, input.businessId);

    // ── 5. Load context for agent invocation ─────────────────────────────────
    const [business, services, history] = await Promise.all([
      businessRepository.findById(input.businessId),
      this.fetchServices(input.businessId),
      conversationRepository.getMessages(conversation.id, input.businessId).then(r => r.messages),
    ]);

    if (!business) {
      throw new Error(`Business '${input.businessId}' not found. Cannot process message.`);
    }

    // ── 6. Invoke the LangGraph Conversation Agent ───────────────────────────
    const t0 = Date.now();
    let agentOutput: AgentStateOutput;
    try {
      agentOutput = await conversationAgent.invoke({
        userMessage: input.content,
        customer,
        conversation,
        business,
        services,
        history: history.slice(0, -1), // exclude the message we just inserted
      });
    } catch (err) {
      logger.error('❌ Graph invocation crashed — returning safe fallback', { route: 'ChatService', businessId: input.businessId, error: err instanceof Error ? err.message : String(err) });
      agentOutput = {
        intent: 'unknown' as ConversationIntent,
        intentConfidence: 0,
        reply: "I'm having a little trouble processing that request right now. Could you try rephrasing it? If needed, I can also connect you with the clinic team.",
        updatedLifecycleState: undefined,
        escalationId: undefined,
        appointmentId: undefined,
        knowledgeRequestId: undefined,
        metadata: { handlerNode: 'graphFallback' as const, graphError: String(err) },
      };
    }

    const totalMs = Date.now() - t0;
    logger.info('✅ Agent invocation complete', { route: 'ChatService', businessId: input.businessId, durationMs: totalMs, intent: agentOutput.intent });

    // ── 7. Apply side-effects from the agent ─────────────────────────────────

    // 7a. Customer lifecycle state transition
    if (agentOutput.updatedLifecycleState &&
        agentOutput.updatedLifecycleState !== customer.lifecycleState) {
      await customerRepository.updateLifecycleState(
        customer.id,
        input.businessId,
        agentOutput.updatedLifecycleState,
        `agent:${agentOutput.intent}`
      );
    }

    // 7b. Schedule recovery sequence after any non-escalated, non-booked interaction
    const skipRecoveryStates = ['Booked', 'Customer', 'Escalated', 'Lost'];
    const finalState = agentOutput.updatedLifecycleState ?? customer.lifecycleState;

    if (!skipRecoveryStates.includes(finalState)) {
      await recoveryService.scheduleRecovery(customer.id, input.businessId, 'inactivity');
    }

    // ── 8. Persist agent reply ────────────────────────────────────────────────
    const replyMessage = await conversationRepository.addMessage(
      conversation.id,
      'agent',
      agentOutput.reply,
      {
        intent: agentOutput.intent,
        intentConfidence: agentOutput.intentConfidence,
        escalationId: agentOutput.escalationId,
        appointmentId: agentOutput.appointmentId,
        knowledgeRequestId: agentOutput.knowledgeRequestId,
        agentTotalMs: totalMs,
        ...agentOutput.metadata,
      }
    );

    // ── 8b. Deliver through delivery service ─────────────────────────────────
    deliveryService.sendMessage({
      businessId: input.businessId,
      customerId: customer.id,
      conversationId: conversation.id,
      messageId: replyMessage.id,
      channelType: conversation.channelType as ChannelType,
      content: agentOutput.reply,
      metadata: {
        intent: agentOutput.intent,
        intentConfidence: agentOutput.intentConfidence,
        agentTotalMs: totalMs,
      },
    }).catch((err) => {
      logger.error('Delivery service error', { route: 'ChatService', businessId: input.businessId, channelType: conversation.channelType, error: err instanceof Error ? err.message : String(err) });
    });

    // ── 9. Update last_interaction_at ────────────────────────────────────────
    const updatedCustomer =
      (await customerRepository.findById(customer.id, input.businessId)) || customer;

    // ── Build AgentResult for response ───────────────────────────────────────
    const agentResult: AgentResult = {
      reply: agentOutput.reply,
      intent: agentOutput.intent,
      updatedLifecycleState: agentOutput.updatedLifecycleState,
      escalationId: agentOutput.escalationId,
      appointmentId: agentOutput.appointmentId,
      knowledgeRequestId: agentOutput.knowledgeRequestId,
      metadata: {
        agentTotalMs: totalMs,
        ...agentOutput.metadata,
      },
    };

    return {
      conversation,
      customer: updatedCustomer,
      userMessage,
      replyMessage,
      agentResult,
    };
  }

  /**
   * Fetches services for a given business.
   * Kept in ChatService to avoid circular imports with appointment.service.ts.
   */
  private async fetchServices(businessId: string) {
    const query = `
      SELECT id, business_id, name, description, price_min, price_max, duration_minutes, is_active, created_at, updated_at
      FROM services
      WHERE business_id = $1 AND is_active = true
      ORDER BY name ASC
    `;
    const res = await pool.query(query, [businessId]);
    return res.rows.map((row: any) => ({
      id: row.id,
      businessId: row.business_id,
      name: row.name,
      description: row.description,
      priceMin: parseFloat(row.price_min),
      priceMax: parseFloat(row.price_max),
      durationMinutes: row.duration_minutes,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }
}

export const chatService = new ChatService();
export default chatService;
