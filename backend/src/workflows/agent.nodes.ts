/**
 * agent.nodes.ts
 *
 * Individual LangGraph node implementations for the FrontDeskOS Conversation Agent.
 * Each node is a pure async function: (state: AgentState) => Partial<AgentState>.
 * Nodes read from state, produce side-effects (DB writes), and return state updates.
 *
 * Nodes:
 *  1. detectIntentNode     — Classifies the customer's message into a ConversationIntent
 *  2. informationNode      — Answers general questions using business FAQs
 *  3. pricingNode          — Responds to pricing queries using service price ranges
 *  4. bookingNode          — Collects details and books an appointment
 *  5. rescheduleNode       — Handles rescheduling of existing appointments
 *  6. cancellationNode     — Cancels an existing appointment
 *  7. escalationNode       — Flags urgent issues and human-takeover requests
 *  8. unknownNode          — Handles unanswerable questions and creates KnowledgeRequests
 */

import { LLMProviderFactory } from '../services/llm/provider.factory';
import {
  businessRepository,
  customerRepository,
  escalationRepository,
  knowledgeRequestRepository,
  appointmentRepository,
  conversationRepository,
} from '../repositories';
import pool from '../config/db';
import { ConversationIntent } from '../types';
import { AgentState } from './agent.state';
import {
  buildIntentDetectionPrompt,
  buildInformationPrompt,
  buildPricingPrompt,
  buildBookingPrompt,
  buildReschedulePrompt,
  buildCancellationPrompt,
  buildEscalationPrompt,
  buildGreetingPrompt,
  buildUnknownPrompt,
  buildLeadCapturePrompt,
  INTENT_TO_NODE,
} from './agent.prompts';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Safely parse LLM JSON output
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filters out non-substantive messages so they never become knowledge requests.
 * Only messages that look like genuine questions or requests for business
 * information should produce learning-inbox entries.
 */
function isGenuineQuestion(message: string): boolean {
  const trimmed = message.trim().toLowerCase();
  // Pure greetings and pleasantries
  const noisePatterns = [
    /^(hi|hello|hey|yo|sup|howdy)\b/i,
    /^(good\s*(morning|afternoon|evening|day))\b/i,
    /^(thanks|thank\s*you|thx|ty)\b/i,
    /^(bye|goodbye|cya|see\s*ya|later)\b/i,
    /^(ok|okay|k|kk|sure|alright|fine|got\s*it)\b/i,
    /^(yes|yeah|yep|yup|no|nope|nah)\b/i,
    /^(lol|lmao|rofl|haha)\b/i,
    /^(what'?s\s*up|how('?s| is) it going|how are you)\b/i,
    /^(nice|great|awesome|perfect|cool|sounds\s*good)\b/i,
    /^(idk|i\s*don'?t\s*know|i\s*guess)\b/i,
    /^[.!?\\s]{0,5}$/,
    // Pure numbers, single words without question marks
    /^\d{1,3}$/,
  ];
  for (const pattern of noisePatterns) {
    if (pattern.test(trimmed)) return false;
  }
  // If it contains a question mark or wh-word, it's likely genuine
  if (/[?]/.test(trimmed)) return true;
  if (/^(what|when|where|why|how|who|which|do|does|can|could|would|will|is|are|have|has|did)\b/i.test(trimmed)) return true;
  // Very short messages are unlikely to be substantive questions
  if (trimmed.length < 6) return false;
  return true;
}
function safeParseJson<T>(text: string): T | null {
  try {
    // Strip markdown code fences if the LLM wraps output in ```json ... ```
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Get services for a business
// ─────────────────────────────────────────────────────────────────────────────
async function fetchServices(businessId: string) {
  const query = `
    SELECT id, business_id, name, description, price_min, price_max, duration_minutes, created_at, updated_at
    FROM services
    WHERE business_id = $1
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
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 1: detectIntentNode
// ─────────────────────────────────────────────────────────────────────────────
export async function detectIntentNode(state: AgentState): Promise<Partial<AgentState>> {
  const t0 = Date.now();

  // ── Workflow continuation guard ──────────────────────────────
  // Skips LLM intent classification when the assistant was already
  // collecting information for a multi-turn workflow (booking,
  // lead_capture, reschedule, cancellation) and the user responds
  // with a short data-like continuation (phone, name, date, time,
  // yes/no, etc.) rather than an explicit intent switch.
  //
  // This prevents bare continuations like "9005093983" from being
  // misclassified as "unknown" by the LLM intent classifier.

  const CONTINUABLE_WORKFLOWS = ['booking', 'lead_capture', 'reschedule', 'cancellation'];
  const completionFlags = ['bookingCreated', 'rescheduleCreated', 'appointmentCancelled', 'appointmentId'];

  const lastAgentMsg = [...state.history].reverse().find(m => m.sender === 'agent');
  const lastIntent = lastAgentMsg?.metadata?.intent as string | undefined;

  if (lastAgentMsg && lastIntent && CONTINUABLE_WORKFLOWS.includes(lastIntent)) {
    const workflowCompleted = completionFlags.some(flag => !!lastAgentMsg.metadata?.[flag]);

    if (!workflowCompleted) {
      const msg = state.userMessage.trim();

      const isContinuation =
        msg.length > 0 &&
        msg.length <= 100 &&
        !msg.includes('?') &&
        !/^(actually|wait|never\s*mind|instead|forget\s*it)/i.test(msg) &&
        !/^(how\s+(much|many|long)|what\s+(are|is|do|does|about)|do\s+you\s+(take|accept|have|offer))/i.test(msg) &&
        !/^(can\s+(i|we)\s+(cancel|reschedule|change)|i\s+(want|need)\s+to\s+(cancel|reschedule))/i.test(msg) &&
        !/^(is\s+this|does\s+that)/i.test(msg);

      if (isContinuation) {
        console.log(`🔁 Workflow continuation: "${lastIntent}" via "${msg}"`);
        return {
          intent: lastIntent as ConversationIntent,
          intentConfidence: 1.0,
          metadata: {
            workflowContinuation: true,
            continuedFrom: lastIntent,
            intentDetectionMs: Date.now() - t0,
          },
        };
      }
    }
  }

  const provider = LLMProviderFactory.getProvider();

  const systemPrompt = buildIntentDetectionPrompt(
    state.business,
    state.services,
    state.history
  );

  let rawOutput = '';
  try {
    rawOutput = await provider.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: state.userMessage },
    ], { temperature: 0.0, responseFormat: 'json' });
  } catch (err) {
    console.error('❌ Intent detection LLM error:', err);
    return {
      intent: 'unknown',
      intentConfidence: 0,
      metadata: { intentDetectionError: String(err), intentDetectionMs: Date.now() - t0 },
    };
  }

  interface IntentResult {
    intent: ConversationIntent;
    confidence: number;
    reasoning?: string;
  }

  const parsed = safeParseJson<IntentResult>(rawOutput);

  const intent: ConversationIntent =
    parsed?.intent && Object.keys(INTENT_TO_NODE).includes(parsed.intent)
      ? parsed.intent
      : 'unknown';

  const confidence = parsed?.confidence ?? 0;

  console.log(`🧠 Intent detected: "${intent}" (confidence: ${confidence}) in ${Date.now() - t0}ms`);

  return {
    intent,
    intentConfidence: confidence,
    metadata: {
      intentRawOutput: rawOutput,
      intentReasoning: parsed?.reasoning,
      intentDetectionMs: Date.now() - t0,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 2: informationNode
// ─────────────────────────────────────────────────────────────────────────────
export async function informationNode(state: AgentState): Promise<Partial<AgentState>> {
  const t0 = Date.now();
  const provider = LLMProviderFactory.getProvider();

  const systemPrompt = buildInformationPrompt(
    state.business,
    state.services,
    state.history,
    state.userMessage
  );

  let reply = "Let me find that information for you. Could you please give me a moment?";
  try {
    reply = await provider.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: state.userMessage },
    ], { temperature: 0.2 });
  } catch (err) {
    console.error('❌ Information node LLM error:', err);
  }

  return {
    reply,
    metadata: { handlerNode: 'informationNode', handlerMs: Date.now() - t0 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 3: pricingNode
// ─────────────────────────────────────────────────────────────────────────────
export async function pricingNode(state: AgentState): Promise<Partial<AgentState>> {
  const t0 = Date.now();
  const provider = LLMProviderFactory.getProvider();

  const systemPrompt = buildPricingPrompt(
    state.business,
    state.services,
    state.history,
    state.userMessage
  );

  let reply = "Let me look up our pricing for you. One moment please.";
  try {
    reply = await provider.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: state.userMessage },
    ], { temperature: 0.1 });
  } catch (err) {
    console.error('❌ Pricing node LLM error:', err);
  }

  return {
    reply,
    metadata: { handlerNode: 'pricingNode', handlerMs: Date.now() - t0 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 4: bookingNode
// ─────────────────────────────────────────────────────────────────────────────
export async function bookingNode(state: AgentState): Promise<Partial<AgentState>> {
  const t0 = Date.now();
  const provider = LLMProviderFactory.getProvider();

  // Try to fetch available slots for the requested date
  let availableSlots: string[] = [];
  let targetDate = new Date().toISOString().slice(0, 10);
  try {
    // Try to extract date from the user message or history
    const dateMatch = state.userMessage.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (dateMatch) targetDate = dateMatch[1];

    const slotsQuery = `
      SELECT appointment_time FROM appointments
      WHERE business_id = $1
        AND DATE(appointment_time) = $2
        AND status IN ('pending', 'confirmed')
      ORDER BY appointment_time ASC
    `;
    const bookedRes = await pool.query(slotsQuery, [state.business.id, targetDate]);
    const bookedTimes = new Set(
      bookedRes.rows.map((r: any) => new Date(r.appointment_time).toTimeString().slice(0, 5))
    );

    const dayOfWeek = new Date(targetDate + 'T00:00:00').getDay();
    const { workingHours, slotDurationMinutes } = state.business.appointmentSettings;
    let hours = workingHours.weekday;
    if (dayOfWeek === 6) hours = workingHours.saturday;
    if (dayOfWeek === 0) hours = workingHours.sunday;

    if (hours) {
      const [sh, sm] = hours.start.split(':').map(Number);
      const [eh, em] = hours.end.split(':').map(Number);
      const cursor = new Date(targetDate + 'T00:00:00');
      cursor.setHours(sh, sm, 0, 0);
      const limit = new Date(targetDate + 'T00:00:00');
      limit.setHours(eh, em, 0, 0);

      while (cursor < limit) {
        const slotStr = cursor.toTimeString().slice(0, 5);
        if (!bookedTimes.has(slotStr)) {
          availableSlots.push(slotStr);
        }
        cursor.setMinutes(cursor.getMinutes() + slotDurationMinutes);
      }
      availableSlots = availableSlots.slice(0, 10);
    }
  } catch {
    // Non-fatal
  }

  const systemPrompt = buildBookingPrompt(
    state.business,
    state.services,
    state.history,
    state.userMessage,
    availableSlots,
    new Date().toISOString().slice(0, 10)
  );

  let rawOutput = '';
  let reply = "Let me help you with that! What date and time works best for you?";
  let appointmentId: string | undefined;

  try {
    rawOutput = await provider.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: state.userMessage },
    ], { temperature: 0.1, responseFormat: 'json' });

    interface BookingResult {
      action: 'collect_info' | 'book';
      reply: string;
      serviceId?: string;
      date?: string;
      time?: string;
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
    }

    const parsed = safeParseJson<BookingResult>(rawOutput);
    if (parsed?.reply) reply = parsed.reply;

    // Save any customer info provided, regardless of action
    if (parsed?.customerName || parsed?.customerEmail || parsed?.customerPhone) {
      try {
        await customerRepository.updateProfile(state.customer.id, {
          name: parsed.customerName || undefined,
          email: parsed.customerEmail || undefined,
          phone: parsed.customerPhone || undefined,
        });
        console.log(`✅ BookingNode: Customer profile updated`);
      } catch (err) {
        console.error('❌ BookingNode: Error updating customer profile:', err);
      }
    }

    if (parsed?.action === 'book' && parsed.date && parsed.time) {
      const appointmentTime = new Date(`${parsed.date}T${parsed.time}:00`);
      if (!isNaN(appointmentTime.getTime()) && appointmentTime > new Date()) {
        try {
          const serviceId = parsed.serviceId || null;
          const appointment = await appointmentRepository.create({
            customerId: state.customer.id,
            businessId: state.business.id,
            serviceId: serviceId,
            appointmentTime,
          });
          appointmentId = appointment.id;
          await customerRepository.updateLifecycleState(state.customer.id, 'Booked', 'agent:booking');
          console.log(`✅ BookingNode: Appointment created ${appointmentId}`);
        } catch (err) {
          console.error('❌ BookingNode: Error creating appointment:', err);
          reply = "I'm sorry, I wasn't able to book that slot. It may already be taken. Would you like to try a different time?";
        }
      }
    }
  } catch (err) {
    console.error('❌ BookingNode LLM error:', err);
    reply = "Let me help you with that! What date and time works best for you?";
  }

  return {
    reply,
    updatedLifecycleState: appointmentId ? 'Booked' : 'Booking Opportunity',
    appointmentId,
    metadata: {
      handlerNode: 'bookingNode',
      handlerMs: Date.now() - t0,
      availableSlotsCount: availableSlots.length,
      bookingCreated: !!appointmentId,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 5: rescheduleNode
// ─────────────────────────────────────────────────────────────────────────────
export async function rescheduleNode(state: AgentState): Promise<Partial<AgentState>> {
  const t0 = Date.now();
  const provider = LLMProviderFactory.getProvider();

  const systemPrompt = buildReschedulePrompt(
    state.business,
    state.services,
    state.history,
    state.userMessage,
    new Date().toISOString().slice(0, 10)
  );

  let rawOutput = '';
  let reply = "I'd be happy to help you reschedule! What date and time works better for you?";
  let appointmentId: string | undefined;

  try {
    rawOutput = await provider.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: state.userMessage },
    ], { temperature: 0.1, responseFormat: 'json' });

    interface RescheduleResult {
      action: 'collect_info' | 'reschedule';
      reply: string;
      newDate?: string;
      newTime?: string;
    }

    const parsed = safeParseJson<RescheduleResult>(rawOutput);
    if (parsed?.reply) reply = parsed.reply;

    if (parsed?.action === 'reschedule' && parsed.newDate && parsed.newTime) {
      const newTime = new Date(`${parsed.newDate}T${parsed.newTime}:00`);
      if (!isNaN(newTime.getTime()) && newTime > new Date()) {
        try {
          // Find the customer's most recent active appointment
          const appointments = await appointmentRepository.findByCustomer(state.customer.id);
          const active = appointments.find(a => a.status === 'pending' || a.status === 'confirmed');
          if (active) {
            const newAppointment = await appointmentRepository.reschedule(active.id, newTime);
            appointmentId = newAppointment.id;
            console.log(`✅ RescheduleNode: Appointment rescheduled ${active.id} → ${newAppointment.id}`);
          } else {
            reply = "I couldn't find an active appointment to reschedule. Would you like to book a new one instead?";
          }
        } catch (err) {
          console.error('❌ RescheduleNode: Error rescheduling:', err);
          reply = "I'm sorry, I wasn't able to reschedule that appointment. That time may not be available.";
        }
      }
    }
  } catch (err) {
    console.error('❌ RescheduleNode LLM error:', err);
  }

  return {
    reply,
    appointmentId,
    metadata: {
      handlerNode: 'rescheduleNode',
      handlerMs: Date.now() - t0,
      rescheduleCreated: !!appointmentId,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 6: cancellationNode
// ─────────────────────────────────────────────────────────────────────────────
export async function cancellationNode(state: AgentState): Promise<Partial<AgentState>> {
  const t0 = Date.now();
  const provider = LLMProviderFactory.getProvider();

  // Attempt to find the customer's most recent active appointment
  let appointmentId: string | undefined;
  try {
    const appointments = await appointmentRepository.findByCustomer(state.customer.id);
    const active = appointments.find(a => a.status === 'pending' || a.status === 'confirmed');
    if (active) {
      appointmentId = active.id;
      await appointmentRepository.updateStatus(active.id, 'cancelled', active.businessId);
    }
  } catch (err) {
    console.error('❌ Cancellation: Error fetching/cancelling appointment:', err);
  }

  const systemPrompt = buildCancellationPrompt(
    state.business,
    state.history,
    state.userMessage
  );

  const reply = await provider.chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: state.userMessage },
  ], { temperature: 0.3 });

  return {
    reply,
    updatedLifecycleState: 'Follow-Up Pending', // Match explicit cancel endpoint behavior
    appointmentId,
    metadata: {
      handlerNode: 'cancellationNode',
      handlerMs: Date.now() - t0,
      appointmentCancelled: !!appointmentId,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 7: escalationNode  (handles both 'escalation' and 'human_request')
// ─────────────────────────────────────────────────────────────────────────────
export async function escalationNode(state: AgentState): Promise<Partial<AgentState>> {
  const t0 = Date.now();
  const provider = LLMProviderFactory.getProvider();

  const reason = state.intent === 'human_request'
    ? 'Customer explicitly requested to speak with a human.'
    : `Automated escalation triggered by intent: ${state.intent}. Message: "${state.userMessage}"`;

  // Create escalation record
  let escalationId: string | undefined;
  try {
    const escalation = await escalationRepository.create({
      customerId: state.customer.id,
      businessId: state.business.id,
      conversationId: state.conversation.id,
      reason,
    });
    escalationId = escalation.id;
    console.log(`🚨 Escalation created: ${escalationId} (reason: ${reason})`);
  } catch (err) {
    console.error('❌ Escalation: Error creating escalation record:', err);
  }

  const systemPrompt = buildEscalationPrompt(
    state.business,
    state.history,
    state.userMessage,
    reason
  );

  let reply = "I understand this is important. I've flagged this for our team and someone will follow up shortly.";
  try {
    reply = await provider.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: state.userMessage },
    ], { temperature: 0.2 });
  } catch (err) {
    console.error('❌ Escalation node LLM error:', err);
  }

  return {
    reply,
    updatedLifecycleState: 'Escalated',
    escalationId,
    metadata: {
      handlerNode: 'escalationNode',
      handlerMs: Date.now() - t0,
      escalationReason: reason,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 8: greetingNode
// ─────────────────────────────────────────────────────────────────────────────
export async function greetingNode(state: AgentState): Promise<Partial<AgentState>> {
  const t0 = Date.now();
  const provider = LLMProviderFactory.getProvider();

  const systemPrompt = buildGreetingPrompt(
    state.business,
    state.services
  );

  let reply = `Hi! 👋 Welcome to ${state.business.name}.\n\nI'm here to help with appointments, treatments, pricing, and general clinic information.\n\nHow can I help you today?`;

  try {
    reply = await provider.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: state.userMessage },
    ], { temperature: 0.4 });
  } catch (err) {
    console.error('❌ Greeting node LLM error:', err);
  }

  return {
    reply,
    metadata: { handlerNode: 'greetingNode', handlerMs: Date.now() - t0 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 9: unknownNode
// ─────────────────────────────────────────────────────────────────────────────
export async function unknownNode(state: AgentState): Promise<Partial<AgentState>> {
  const t0 = Date.now();
  const provider = LLMProviderFactory.getProvider();

  const systemPrompt = buildUnknownPrompt(
    state.business,
    state.history,
    state.userMessage
  );

  interface UnknownResult {
    reply: string;
    suggestedAnswer: string;
  }

  let rawOutput = '';
  let reply = "I don't have that information right now, but I can have our team follow up with you. If you'd like, I can also help schedule an appointment or answer questions about our services.";
  let suggestedAnswer: string | null = null;

  try {
    rawOutput = await provider.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: state.userMessage },
    ], { temperature: 0.4, responseFormat: 'json' });

    const parsed = safeParseJson<UnknownResult>(rawOutput);
    if (parsed?.reply) reply = parsed.reply;
    if (parsed?.suggestedAnswer) suggestedAnswer = parsed.suggestedAnswer;
  } catch (err) {
    console.error('❌ Unknown node LLM error:', err);
  }

  // Log to the Learning Inbox for owner review — only for genuine questions
  let knowledgeRequestId: string | undefined;
  if (isGenuineQuestion(state.userMessage)) {
    try {
      const kr = await knowledgeRequestRepository.create({
        businessId: state.business.id,
        conversationId: state.conversation.id,
        unansweredQuestion: state.userMessage,
        suggestedAnswer,
      });
      knowledgeRequestId = kr.id;
      console.log(`📚 Knowledge request created: ${knowledgeRequestId}`);
    } catch (err) {
      console.error('❌ Unknown node: Error creating knowledge request:', err);
    }
  }

  return {
    reply,
    knowledgeRequestId,
    metadata: {
      handlerNode: 'unknownNode',
      handlerMs: Date.now() - t0,
      suggestedAnswer,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 10: leadCaptureNode
// ─────────────────────────────────────────────────────────────────────────────
export async function leadCaptureNode(state: AgentState): Promise<Partial<AgentState>> {
  const t0 = Date.now();

  const hasName = !!state.customer.name && state.customer.name !== state.customer.id;
  const hasEmail = !!state.customer.email;
  const hasPhone = !!state.customer.phone;

  // All info already collected — confirm and done
  if (hasName && hasEmail && hasPhone) {
    return {
      reply: `Thanks, ${state.customer.name}! I've noted your details and the clinic will reach out to you soon. Is there anything else I can help with?`,
      metadata: { handlerNode: 'leadCaptureNode', handlerMs: Date.now() - t0 },
    };
  }

  const provider = LLMProviderFactory.getProvider();

  const systemPrompt = buildLeadCapturePrompt(
    state.business,
    state.history,
    state.userMessage,
    state.customer.name && state.customer.name !== state.customer.id ? state.customer.name : undefined,
    state.customer.email || undefined,
    state.customer.phone || undefined
  );

  let reply = "No problem at all. If you'd like, I can have the clinic reach out with more information. What's the best way to contact you?";
  let updatedName: string | undefined;
  let updatedEmail: string | undefined;
  let updatedPhone: string | undefined;

  try {
    const rawOutput = await provider.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: state.userMessage },
    ], { temperature: 0.3, responseFormat: 'json' });

    interface LeadCaptureResult {
      reply: string;
      name?: string;
      email?: string;
      phone?: string;
      allCollected: boolean;
    }

    const parsed = safeParseJson<LeadCaptureResult>(rawOutput);
    if (parsed?.reply) reply = parsed.reply;
    if (parsed?.name) updatedName = parsed.name;
    if (parsed?.email) updatedEmail = parsed.email;
    if (parsed?.phone) updatedPhone = parsed.phone;
  } catch (err) {
    console.error('❌ LeadCaptureNode LLM error:', err);
  }

  if (updatedName || updatedEmail || updatedPhone) {
    try {
      await customerRepository.updateProfile(state.customer.id, {
        name: updatedName,
        email: updatedEmail,
        phone: updatedPhone,
      });
      console.log(`✅ LeadCaptureNode: Customer profile updated with collected info`);
    } catch (err) {
      console.error('❌ LeadCaptureNode: Error updating customer profile:', err);
    }
  }

  return {
    reply,
    updatedLifecycleState: (updatedName || updatedEmail || updatedPhone) ? 'Qualified' : undefined,
    metadata: {
      handlerNode: 'leadCaptureNode',
      handlerMs: Date.now() - t0,
    },
  };
}
