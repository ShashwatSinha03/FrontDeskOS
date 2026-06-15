/**
 * agent.nodes.ts
 *
 * Individual LangGraph node implementations for the Nuvora Conversation Agent.
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
import { notificationService } from '../services/notification.service';
import pool from '../config/db';
import { ConversationIntent, CollectedData } from '../types';
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
  detectPromptInjection,
} from './agent.prompts';
import { logger } from '../lib/logger';
import {
  getBusinessDateStr,
  getTimeStrInTz,
  getDayOfWeekInTz,
  fromBusinessTimeToUtc,
} from '../lib/timezone';
import {
  workflowStateService,
  computeWorkflowState,
  getMissingBookingFields,
  getMissingCustomerDetails,
  isDirectAnswerToLastField,
  extractFieldValue,
  formatMissingFieldsHint,
  isWorkflowExpired,
  WORKFLOW_TIMEOUT_HOURS,
} from '../services/workflow-state.service';

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

// ─────────────────────────────────────────────────────────────────────────────
// LLM OUTPUT VALIDATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that a serviceId from LLM output actually exists in the business's
 * active services list. Prevents booking of non-existent or deactivated services.
 */
function validateServiceId(serviceId: string | undefined, services: AgentState['services']): boolean {
  if (!serviceId) return true;
  return services.some(s => s.id === serviceId);
}

/**
 * Validates that an appointment belongs to the given customer.
 * Prevents unauthorized access to other customers' appointments.
 */
async function validateAppointmentOwnership(appointmentId: string, customerId: string, businessId: string): Promise<boolean> {
  try {
    const appointments = await appointmentRepository.findByCustomer(customerId, businessId);
    return appointments.some(a => a.id === appointmentId);
  } catch {
    return false;
  }
}

/**
 * Validates that a date-time string is a valid future date
 * in the business's timezone.
 */
function isValidFutureDateTime(dateStr: string, timeStr: string, tz: string): boolean {
  const dt = fromBusinessTimeToUtc(tz, dateStr, timeStr);
  return !isNaN(dt.getTime()) && dt > new Date();
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 1: detectIntentNode
// ─────────────────────────────────────────────────────────────────────────────
export async function detectIntentNode(state: AgentState): Promise<Partial<AgentState>> {
  const t0 = Date.now();

  // ── Prompt injection detection ────────────────────────────
  const injection = detectPromptInjection(state.userMessage);
  if (injection.isInjection) {
    logger.warn('🚨 Prompt injection detected', { route: 'AgentNodes', businessId: state.business?.id, injectionScore: injection.score, injectionReason: injection.reason, messagePreview: state.userMessage.slice(0, 100) });
  }

  const msg = state.userMessage.trim();
  const isAffirmation = /^(yes|yeah|yep|yup|ok|okay|k|kk|sure|alright|fine|got\s*it|sounds\s*good|that\s*works|perfect|great|awesome|correct|right)\b/i.test(msg) && msg.length < 40;

  // ── Active workflow routing ─────────────────────────────────
  // If an active booking workflow exists and the user sends a
  // greeting, unknown, or affirmation message, route to booking
  // node for workflow recovery instead of starting fresh.
  const CONTINUABLE_WORKFLOWS = ['booking', 'lead_capture', 'reschedule', 'cancellation'];
  const completionFlags = ['bookingCreated', 'rescheduleCreated', 'appointmentCancelled', 'appointmentId'];

  const lastAgentMsg = [...state.history].reverse().find(m => m.sender === 'agent');
  const lastIntentFromHistory = lastAgentMsg?.metadata?.intent as string | undefined;

  const activeBookingWorkflow = state.activeWorkflow;
  if (activeBookingWorkflow) {
    const isExpired = isWorkflowExpired(activeBookingWorkflow);
    const isTerminal = activeBookingWorkflow.workflowState === 'BOOKED' || activeBookingWorkflow.workflowState === 'CANCELLED';

    let needsRecovery = false;

    if (!isExpired && !isTerminal) {
      // Direct answer to last asked field — always route to booking
      if (activeBookingWorkflow.lastAskedField && isDirectAnswerToLastField(msg, activeBookingWorkflow.lastAskedField)) {
        needsRecovery = true;
      }

      // Greeting, affirmation, or short message with active workflow
      if (!needsRecovery) {
        const includesQuestion = msg.includes('?');
        const isPureGreeting = /^(hi|hello|hey|yo|sup|howdy|good\s*(morning|afternoon|evening|day))\b/i.test(msg);
        const isShortContinuation = msg.length > 0 && msg.length <= 100 && !includesQuestion;

        if (isPureGreeting || isAffirmation || isShortContinuation) {
          needsRecovery = true;
        }
      }
    }

    if (needsRecovery) {
      logger.info('🔁 Active workflow recovery routing', { route: 'AgentNodes', businessId: state.business?.id, workflowState: activeBookingWorkflow.workflowState, lastAskedField: activeBookingWorkflow.lastAskedField, message: msg });
      return {
        intent: 'booking' as ConversationIntent,
        intentConfidence: 1.0,
        metadata: {
          workflowRecovery: true,
          continuedFrom: 'booking',
          intentDetectionMs: Date.now() - t0,
          injectionScore: injection.score,
          injectionReason: injection.reason,
        },
      };
    }
  }

  // ── Existing workflow continuation guard ──────────────────────
  // Skips LLM intent classification when the assistant was already
  // collecting information for a multi-turn workflow and the user
  // responds with a short data-like continuation.

  if (lastAgentMsg && lastIntentFromHistory && CONTINUABLE_WORKFLOWS.includes(lastIntentFromHistory)) {
    const workflowCompleted = completionFlags.some(flag => !!lastAgentMsg.metadata?.[flag]);

    if (!workflowCompleted) {
      const isContinuation =
        msg.length > 0 &&
        msg.length <= 100 &&
        !msg.includes('?') &&
        !/^(actually|wait|never\s*mind|instead|forget\s*it)/i.test(msg) &&
        !/^(how\s+(much|many|long)|what\s+(are|is|do|does|about)|do\s+you\s+(take|accept|have|offer))/i.test(msg) &&
        !/^(can\s+(i|we)\s+(cancel|reschedule|change)|i\s+(want|need)\s+to\s+(cancel|reschedule))/i.test(msg) &&
        !/^(is\s+this|does\s+that)/i.test(msg);

      if (isContinuation) {
        logger.info('🔁 Workflow continuation', { route: 'AgentNodes', businessId: state.business?.id, lastIntent: lastIntentFromHistory, message: msg });
      return {
        intent: lastIntentFromHistory as ConversationIntent,
        intentConfidence: 1.0,
        metadata: {
          workflowContinuation: true,
          continuedFrom: lastIntentFromHistory,
          intentDetectionMs: Date.now() - t0,
          injectionScore: injection.score,
          injectionReason: injection.reason,
        },
      };
      }
    }
  }

  const provider = LLMProviderFactory.getProvider();

  const tz = state.business.timezone || 'UTC';
  const systemPrompt = buildIntentDetectionPrompt(
    state.business,
    state.services,
    state.history,
    getBusinessDateStr(tz)
  );

  let rawOutput = '';
  try {
    rawOutput = await provider.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: state.userMessage },
    ], { temperature: 0.0, responseFormat: 'json' });
  } catch (err) {
    logger.error('❌ Intent detection LLM error', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, error: err instanceof Error ? err.message : String(err) });
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

  logger.info('🧠 Intent detected', { route: 'AgentNodes', businessId: state.business?.id, intent, confidence, durationMs: Date.now() - t0 });

  return {
    intent,
    intentConfidence: confidence,
    metadata: {
      intentRawOutput: rawOutput,
      intentReasoning: parsed?.reasoning,
      intentDetectionMs: Date.now() - t0,
      injectionScore: injection.score,
      injectionReason: injection.reason,
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
    logger.error('❌ Information node LLM error', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, error: err instanceof Error ? err.message : String(err) });
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
    logger.error('❌ Pricing node LLM error', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, error: err instanceof Error ? err.message : String(err) });
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
  const tz = state.business.timezone || 'UTC';
  const servicesCount = state.services.length;

  // ── 1. Load or initialize workflow state ──────────────────────
  let workflow = state.activeWorkflow;
  if (!workflow) {
    workflow = await workflowStateService.getOrCreateBookingWorkflow(state.conversation.id);
  } else if (isWorkflowExpired(workflow)) {
    workflow = await workflowStateService.getOrCreateBookingWorkflow(state.conversation.id);
  }

  // ── 2. Direct-answer extraction (customer answered last asked field) ──
  const directExtracted: CollectedData = {};
  if (workflow.lastAskedField) {
    const value = extractFieldValue(state.userMessage, workflow.lastAskedField, tz);
    if (value) {
      if (workflow.lastAskedField === 'date') directExtracted.date = value;
      else if (workflow.lastAskedField === 'time') directExtracted.time = value;
      else if (workflow.lastAskedField === 'customerName') directExtracted.customerName = value;
      else if (workflow.lastAskedField === 'customerPhone') directExtracted.customerPhone = value;
    }
  }

  // ── 3. Merge direct-extracted fields, clear lastAskedField (customer answered) ──
  if (Object.keys(directExtracted).length > 0) {
    workflow = await workflowStateService.updateBookingData(
      workflow,
      directExtracted,
      null,
      servicesCount,
      state.customer,
    );
  }

  // ── 4. Compute missing fields from updated state ──────────────
  const missingFields = getMissingBookingFields(workflow.collectedData, servicesCount, state.customer);
  const nextField = missingFields.length > 0 ? missingFields[0] : undefined;

  // ── 5. Auto-query availability if all fields collected ────────
  let availableSlots: string[] = [];
  const workflowState = computeWorkflowState(workflow.collectedData, servicesCount, state.customer);

  if (workflowState === 'CHECKING_AVAILABILITY' || workflowState === 'CONFIRMING') {
    const cacheValid = workflow.slotsFetchedAt
      && (Date.now() - new Date(workflow.slotsFetchedAt).getTime()) < 15 * 60 * 1000;

    if (workflow.availableSlots && cacheValid && workflow.availableSlots.length > 0) {
      availableSlots = workflow.availableSlots;
    } else {
      const { workingHours, slotDurationMinutes } = state.business.appointmentSettings;
      try {
        availableSlots = await workflowStateService.refreshAvailability(
          workflow,
          state.business.id,
          slotDurationMinutes,
          workingHours,
          tz,
        );
      } catch {
        // Non-fatal — LLM can still respond without slots
      }
    }
  }

  // ── 6. Build prompt with workflow context ─────────────────────
  const isRecovery = state.metadata?.workflowRecovery === true;
  const systemPrompt = buildBookingPrompt(
    state.business,
    state.services,
    state.history,
    state.userMessage,
    availableSlots,
    getBusinessDateStr(tz),
    missingFields,
    workflow.collectedData,
    isRecovery,
  );

  // ── 7. Call LLM ──────────────────────────────────────────────
  let rawOutput = '';
  let reply = "Let me help you with that! What date and time works best for you?";
  let appointmentId: string | undefined;

  try {
    rawOutput = await provider.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: state.userMessage },
    ], { temperature: 0.1, responseFormat: 'json' });

    interface BookingResult {
      action: 'collect_info' | 'confirm' | 'book';
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

    // ── 8. Merge LLM-extracted entities, set lastAskedField = nextField ──
    const llmExtracted: CollectedData = {};
    if (parsed?.date) llmExtracted.date = parsed.date;
    if (parsed?.time) llmExtracted.time = parsed.time;
    if (parsed?.serviceId) llmExtracted.serviceId = parsed.serviceId;
    if (parsed?.customerName) llmExtracted.customerName = parsed.customerName;
    if (parsed?.customerEmail) llmExtracted.customerEmail = parsed.customerEmail;
    if (parsed?.customerPhone) llmExtracted.customerPhone = parsed.customerPhone;

    if (Object.keys(llmExtracted).length > 0 || nextField) {
      workflow = await workflowStateService.updateBookingData(
        workflow,
        llmExtracted,
        nextField,
        servicesCount,
        state.customer,
      );
    }

    // Save any customer info provided, regardless of action
    if (parsed?.customerName || parsed?.customerEmail || parsed?.customerPhone) {
      try {
        await customerRepository.updateProfile(state.customer.id, state.business.id, {
          name: parsed.customerName || undefined,
          email: parsed.customerEmail || undefined,
          phone: parsed.customerPhone || undefined,
        });
        logger.info('✅ BookingNode: Customer profile updated', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id });
      } catch (err) {
        logger.error('❌ BookingNode: Error updating customer profile', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, error: err instanceof Error ? err.message : String(err) });
      }
    }

    // ── 9. Handle confirm action (intermediate step before booking) ──
    if (parsed?.action === 'confirm' && parsed.date && parsed.time) {
      if (!isValidFutureDateTime(parsed.date, parsed.time, tz)) {
        reply = "That date or time doesn't look valid. Could you please provide a different date and time?";
        return { reply, metadata: { handlerNode: 'bookingNode', handlerMs: Date.now() - t0, validationFailed: true } };
      }
      workflow = await workflowStateService.updateBookingData(
        workflow,
        llmExtracted,
        null,
        servicesCount,
        state.customer,
      );
      return {
        reply: parsed.reply || `Just to confirm — I have you down for ${parsed.date} at ${parsed.time}. Shall I go ahead and book it?`,
        metadata: { handlerNode: 'bookingNode', handlerMs: Date.now() - t0, awaitingConfirmation: true },
      };
    }

    // ── 10. Execute booking only on explicit 'book' action ───────
    if (parsed?.action === 'book' && parsed.date && parsed.time) {
      if (!isValidFutureDateTime(parsed.date, parsed.time, tz)) {
        reply = "That date or time doesn't look valid. Could you please provide a different date and time?";
        return { reply, metadata: { handlerNode: 'bookingNode', handlerMs: Date.now() - t0, validationFailed: true } };
      }
      if (!validateServiceId(parsed.serviceId, state.services)) {
        logger.warn('🚨 BookingNode: LLM returned invalid serviceId — not in active services', { route: 'AgentNodes', businessId: state.business?.id, serviceId: parsed.serviceId });
        reply = "I'm sorry, that service doesn't appear to be available. Would you like to choose another?";
        return { reply, metadata: { handlerNode: 'bookingNode', handlerMs: Date.now() - t0, validationFailed: true } };
      }
      const appointmentTime = fromBusinessTimeToUtc(tz, parsed.date, parsed.time);
      if (!isNaN(appointmentTime.getTime()) && appointmentTime > new Date()) {
        // Check availability before booking
        const { slotDurationMinutes } = state.business.appointmentSettings;
        const isAvailable = await appointmentRepository.checkAvailability(
          state.business.id,
          appointmentTime,
          slotDurationMinutes || 30,
        );
        if (!isAvailable) {
          reply = "I'm sorry, that time slot is no longer available. Would you like to choose a different time?";
          return { reply, metadata: { handlerNode: 'bookingNode', handlerMs: Date.now() - t0, slotUnavailable: true } };
        }
        try {
          const serviceId = parsed.serviceId || null;
          const appointment = await appointmentRepository.create({
            customerId: state.customer.id,
            businessId: state.business.id,
            serviceId: serviceId,
            appointmentTime,
          });
          appointmentId = appointment.id;
          await workflowStateService.markBooked(workflow);
          await customerRepository.updateLifecycleState(state.customer.id, state.business.id, 'Booked', 'agent:booking');
          logger.info('✅ BookingNode: Appointment created', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, appointmentId });
        } catch (err) {
          logger.error('❌ BookingNode: Error creating appointment', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, error: err instanceof Error ? err.message : String(err) });
          // Check for unique constraint violation (double-booking prevention)
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('uq_appointment_active_slot') || msg.includes('duplicate key')) {
            reply = "I'm sorry, that time slot was just taken. Would you like to try a different time?";
          } else {
            reply = "I'm sorry, I wasn't able to book that slot. Would you like to try a different time?";
          }
        }
      }
    }
  } catch (err) {
    logger.error('❌ BookingNode LLM error', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, error: err instanceof Error ? err.message : String(err) });
    reply = "Let me help you with that! What date and time works best for you?";
  }

  const finalState = computeWorkflowState(
    workflow.collectedData,
    servicesCount,
    state.customer,
  );

  return {
    reply,
    updatedLifecycleState: appointmentId ? 'Booked' : 'Booking Opportunity',
    appointmentId,
    metadata: {
      handlerNode: 'bookingNode',
      handlerMs: Date.now() - t0,
      availableSlotsCount: availableSlots.length,
      bookingCreated: !!appointmentId,
      workflowState: finalState,
      missingFields,
      workflowId: workflow.id,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 5: rescheduleNode
// ─────────────────────────────────────────────────────────────────────────────
export async function rescheduleNode(state: AgentState): Promise<Partial<AgentState>> {
  const t0 = Date.now();
  const provider = LLMProviderFactory.getProvider();

  const tz = state.business.timezone || 'UTC';
  const systemPrompt = buildReschedulePrompt(
    state.business,
    state.services,
    state.history,
    state.userMessage,
    getBusinessDateStr(tz)
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
      action: 'collect_info' | 'confirm' | 'reschedule';
      reply: string;
      newDate?: string;
      newTime?: string;
    }

    const parsed = safeParseJson<RescheduleResult>(rawOutput);
    if (parsed?.reply) reply = parsed.reply;

    // Handle confirm action (ask customer to confirm before proceeding)
    if (parsed?.action === 'confirm' && parsed.newDate && parsed.newTime) {
      if (!isValidFutureDateTime(parsed.newDate, parsed.newTime, tz)) {
        reply = "That date or time doesn't look valid. Could you please provide a different date and time?";
        return { reply, metadata: { handlerNode: 'rescheduleNode', handlerMs: Date.now() - t0, validationFailed: true } };
      }
      return {
        reply: parsed.reply || `Just to confirm — reschedule to ${parsed.newDate} at ${parsed.newTime}?`,
        metadata: { handlerNode: 'rescheduleNode', handlerMs: Date.now() - t0, awaitingConfirmation: true },
      };
    }

    // Only execute reschedule on explicit 'reschedule' action (after customer confirmed)
    if (parsed?.action === 'reschedule' && parsed.newDate && parsed.newTime) {
      if (!isValidFutureDateTime(parsed.newDate, parsed.newTime, tz)) {
        reply = "That date or time doesn't look valid. Could you please provide a different date and time?";
        return { reply, metadata: { handlerNode: 'rescheduleNode', handlerMs: Date.now() - t0, validationFailed: true } };
      }
      const newTime = fromBusinessTimeToUtc(tz, parsed.newDate, parsed.newTime);
      if (!isNaN(newTime.getTime()) && newTime > new Date()) {
        try {
          // Find the customer's most recent active appointment
          const appointments = await appointmentRepository.findByCustomer(state.customer.id, state.business.id);
          const active = appointments.find(a => a.status === 'pending' || a.status === 'confirmed');
          if (active) {
            const newAppointment = await appointmentRepository.reschedule(active.id, active.businessId, newTime);
            appointmentId = newAppointment.id;
            logger.info('✅ RescheduleNode: Appointment rescheduled after customer confirmation', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, oldAppointmentId: active.id, newAppointmentId: newAppointment.id });
          } else {
            reply = "I couldn't find an active appointment to reschedule. Would you like to book a new one instead?";
          }
        } catch (err) {
          logger.error('❌ RescheduleNode: Error rescheduling', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, error: err instanceof Error ? err.message : String(err) });
          reply = "I'm sorry, I wasn't able to reschedule that appointment. That time may not be available.";
        }
      }
    }
  } catch (err) {
    logger.error('❌ RescheduleNode LLM error', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, error: err instanceof Error ? err.message : String(err) });
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

  const systemPrompt = buildCancellationPrompt(
    state.business,
    state.history,
    state.userMessage
  );

  let rawOutput = '';
  let reply = "I understand you'd like to cancel. Are you sure you want to cancel your appointment? I can reschedule if that works better.";
  let appointmentId: string | undefined;

  try {
    rawOutput = await provider.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: state.userMessage },
    ], { temperature: 0.1, responseFormat: 'json' });

    interface CancellationResult {
      action: 'collect_info' | 'confirm_cancel';
      reply: string;
    }

    const parsed = safeParseJson<CancellationResult>(rawOutput);
    if (parsed?.reply) reply = parsed.reply;

    // Only cancel on explicit customer confirmation
    if (parsed?.action === 'confirm_cancel') {
      try {
        const appointments = await appointmentRepository.findByCustomer(state.customer.id, state.business.id);
        const active = appointments.find(a => a.status === 'pending' || a.status === 'confirmed');
        if (active) {
          appointmentId = active.id;
          await appointmentRepository.updateStatus(active.id, 'cancelled', active.businessId);
          logger.info('✅ Cancellation: Appointment cancelled after customer confirmation', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, appointmentId });
        } else {
          reply = "I couldn't find an active appointment to cancel. Would you like to book a new one instead?";
        }
      } catch (err) {
        logger.error('❌ Cancellation: Error cancelling appointment', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, error: err instanceof Error ? err.message : String(err) });
      }
    }
  } catch (err) {
    logger.error('❌ CancellationNode LLM error', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, error: err instanceof Error ? err.message : String(err) });
  }

  return {
    reply,
    updatedLifecycleState: appointmentId ? 'Follow-Up Pending' : undefined,
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
    logger.info('🚨 Escalation created', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, escalationId, reason });

    notificationService.create({
      businessId: state.business.id,
      type: 'escalation_raised',
      title: 'Escalation Raised',
      message: `${state.customer.name || 'A customer'} escalated: ${reason}`,
      entityType: 'escalation',
      entityId: escalation.id,
    }).catch((err) => logger.error('[Notifications] Failed to create escalation_raised', { route: 'AgentNodes', businessId: state.business?.id, error: err instanceof Error ? err.message : String(err) }));
  } catch (err) {
    logger.error('❌ Escalation: Error creating escalation record', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, error: err instanceof Error ? err.message : String(err) });
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
    logger.error('❌ Escalation node LLM error', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, error: err instanceof Error ? err.message : String(err) });
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

  let reply = `Hi! 👋 Welcome to ${state.business.name}. How can I help you today?`;

  try {
    reply = await provider.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: state.userMessage },
    ], { temperature: 0.4 });
  } catch (err) {
    logger.error('❌ Greeting node LLM error', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, error: err instanceof Error ? err.message : String(err) });
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
    logger.error('❌ Unknown node LLM error', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, error: err instanceof Error ? err.message : String(err) });
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
      logger.info('📚 Knowledge request created', { route: 'AgentNodes', businessId: state.business?.id, conversationId: state.conversation?.id, knowledgeRequestId });
    } catch (err) {
      logger.error('❌ Unknown node: Error creating knowledge request', { route: 'AgentNodes', businessId: state.business?.id, conversationId: state.conversation?.id, error: err instanceof Error ? err.message : String(err) });
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
    logger.error('❌ LeadCaptureNode LLM error', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, error: err instanceof Error ? err.message : String(err) });
  }

  if (updatedName || updatedEmail || updatedPhone) {
    try {
      await customerRepository.updateProfile(state.customer.id, state.business.id, {
        name: updatedName,
        email: updatedEmail,
        phone: updatedPhone,
      });
      logger.info('✅ LeadCaptureNode: Customer profile updated with collected info', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id });
    } catch (err) {
      logger.error('❌ LeadCaptureNode: Error updating customer profile', { route: 'AgentNodes', businessId: state.business?.id, customerId: state.customer?.id, error: err instanceof Error ? err.message : String(err) });
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
