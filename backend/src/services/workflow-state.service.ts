import { ConversationWorkflow, CollectedData, WorkflowState, WorkflowType, Business, Customer } from '../types';
import { conversationWorkflowRepository } from '../repositories';
import { getBusinessDateStr, getDayOfWeekInTz, fromBusinessTimeToUtc, getTimeStrInTz } from '../lib/timezone';
import pool from '../config/db';

export const WORKFLOW_TIMEOUT_HOURS = 24;
export const SLOTS_CACHE_TTL_MINUTES = 15;

/**
 * Determines the current workflow state based on what data has been collected.
 *
 * This is PURE application logic — the LLM never controls workflow state.
 * State progression is deterministic based solely on collectedData.
 */
export function computeWorkflowState(
  collectedData: CollectedData,
  servicesCount: number,
  customer: Customer,
): WorkflowState {
  if (!collectedData.serviceId && servicesCount > 1) {
    return 'COLLECTING_SERVICE';
  }

  if (!collectedData.date) {
    return 'COLLECTING_DATE';
  }

  if (!collectedData.time) {
    return 'COLLECTING_TIME';
  }

  const missingDetails = getMissingCustomerDetails(collectedData, customer);
  if (missingDetails.length > 0) {
    return 'COLLECTING_CUSTOMER_DETAILS';
  }

  return 'CHECKING_AVAILABILITY';
}

/**
 * Returns which customer details are still missing.
 * Business-aware: considers what the customer profile already has.
 */
export function getMissingCustomerDetails(
  collectedData: CollectedData,
  customer: Customer,
): string[] {
  const missing: string[] = [];

  if (!collectedData.customerName && !customer.name) {
    missing.push('customerName');
  }

  if (!collectedData.customerPhone && !customer.phone) {
    missing.push('customerPhone');
  }

  if (!collectedData.customerEmail && !customer.email) {
    missing.push('customerEmail');
  }

  return missing;
}

/**
 * Returns which booking fields are still missing for the current workflow state.
 */
export function getMissingBookingFields(
  collectedData: CollectedData,
  servicesCount: number,
  customer: Customer,
): string[] {
  const state = computeWorkflowState(collectedData, servicesCount, customer);
  switch (state) {
    case 'COLLECTING_SERVICE':
      return ['service'];
    case 'COLLECTING_DATE':
      return ['date'];
    case 'COLLECTING_TIME':
      return ['time'];
    case 'COLLECTING_CUSTOMER_DETAILS':
      return getMissingCustomerDetails(collectedData, customer);
    default:
      return [];
  }
}

/**
 * Generates a human-readable summary of missing fields for prompt injection.
 */
export function formatMissingFieldsHint(missingFields: string[]): string {
  if (missingFields.length === 0) return '';
  const labels: Record<string, string> = {
    service: 'service type',
    date: 'preferred date',
    time: 'preferred time',
    customerName: 'your name',
    customerPhone: 'your phone number',
    customerEmail: 'your email address',
  };
  return missingFields.map(f => labels[f] || f).join(', ');
}

/**
 * Checks whether the workflow has expired based on last_updated_at.
 */
export function isWorkflowExpired(workflow: ConversationWorkflow): boolean {
  const elapsed = Date.now() - new Date(workflow.lastUpdatedAt).getTime();
  return elapsed > WORKFLOW_TIMEOUT_HOURS * 60 * 60 * 1000;
}

/**
 * Checks whether the cached slots are still valid.
 */
export function areSlotsValid(workflow: ConversationWorkflow): boolean {
  if (!workflow.slotsFetchedAt || !workflow.availableSlots) return false;
  const elapsed = Date.now() - new Date(workflow.slotsFetchedAt).getTime();
  return elapsed < SLOTS_CACHE_TTL_MINUTES * 60 * 1000;
}

/**
 * Determines the next field the AI should ask about.
 * Uses lastAskedField to detect when a customer has directly answered
 * the previous question, reducing repeated-question loops.
 */
export function getNextFieldToAsk(
  missingFields: string[],
  lastAskedField?: string,
): string | undefined {
  if (missingFields.length === 0) return undefined;

  if (lastAskedField) {
    const idx = missingFields.indexOf(lastAskedField);
    if (idx >= 0) {
      return missingFields[(idx + 1) % missingFields.length];
    }
  }

  return missingFields[0];
}

/**
 * Attempts to determine whether the user's message is a direct answer
 * to the last asked field.
 */
export function isDirectAnswerToLastField(
  message: string,
  lastAskedField: string,
): boolean {
  const lowered = message.trim().toLowerCase();

  switch (lastAskedField) {
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(message)
        || /\b(today|tomorrow|next\s+\w+|\d{1,2}(st|nd|rd|th)?\s+\w+)\b/i.test(lowered)
        || /^\d{1,2}\/\d{1,2}/.test(message);
    case 'time':
      return /\b(\d{1,2}(:\d{2})?\s*(am|pm)?)\b/i.test(message)
        || /^\d{1,2}:\d{2}$/.test(message)
        || /^\d{1,2}\s*(am|pm)$/i.test(message);
    case 'service':
      return !/^(hi|hello|hey|thanks|bye|ok|okay|yes|no|what|how|why|when|where|who)$/i.test(lowered)
        && lowered.length > 2;
    case 'customerName':
      return /^[A-Za-z\s'-]{2,}$/.test(message.trim());
    case 'customerPhone':
      return /^[\d\s\+\(\)\-]{7,}$/.test(message.trim());
    default:
      return false;
  }
}

/**
 * Extract structured values from a message for the given field type.
 */
export function extractFieldValue(
  message: string,
  field: string,
  tz: string,
): string | undefined {
  const lowered = message.trim();

  switch (field) {
    case 'date': {
      const yyyymmdd = lowered.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (yyyymmdd) return `${yyyymmdd[1]}-${yyyymmdd[2]}-${yyyymmdd[3]}`;

      if (/\btoday\b/i.test(lowered)) {
        return getBusinessDateStr(tz);
      }

      const tomorrowMatch = lowered.match(/tomorrow/i);
      if (tomorrowMatch) {
        const now = new Date();
        now.setDate(now.getDate() + 1);
        const fmt = new Intl.DateTimeFormat('en-CA', {
          timeZone: tz,
          year: 'numeric', month: '2-digit', day: '2-digit',
        });
        return fmt.format(now);
      }

      const relativeMatch = lowered.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
      if (relativeMatch) {
        const dayNames: Record<string, number> = {
          sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
          thursday: 4, friday: 5, saturday: 6,
        };
        const now = new Date();
        const currentDay = now.getDay();
        const targetDay = dayNames[relativeMatch[1].toLowerCase()];
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        now.setDate(now.getDate() + daysUntil);
        const fmt = new Intl.DateTimeFormat('en-CA', {
          timeZone: tz,
          year: 'numeric', month: '2-digit', day: '2-digit',
        });
        return fmt.format(now);
      }

      return undefined;
    }

    case 'time': {
      const colonMatch = lowered.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
      const noColonMatch = !colonMatch && lowered.match(/(\d{1,2})\s*(am|pm)/i);

      let hours: number;
      let minutes: number;
      let meridian: string;

      if (colonMatch) {
        hours = parseInt(colonMatch[1], 10);
        minutes = parseInt(colonMatch[2], 10);
        meridian = (colonMatch[3] || '').toLowerCase();
      } else if (noColonMatch) {
        hours = parseInt(noColonMatch[1], 10);
        minutes = 0;
        meridian = noColonMatch[2].toLowerCase();
      } else {
        return undefined;
      }

      if (meridian === 'pm' && hours < 12) hours += 12;
      if (meridian === 'am' && hours === 12) hours = 0;

      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    default:
      return undefined;
  }
}

export class WorkflowStateService {
  /**
   * Initializes a new booking workflow for a conversation.
   */
  async initBookingWorkflow(
    conversationId: string,
  ): Promise<ConversationWorkflow> {
    return conversationWorkflowRepository.upsert({
      conversationId,
      workflowType: 'appointment_booking',
      workflowState: 'STARTED',
      workflowVersion: 1,
      collectedData: {},
    });
  }

  /**
   * Gets or creates a booking workflow for a conversation.
   */
  async getOrCreateBookingWorkflow(
    conversationId: string,
  ): Promise<ConversationWorkflow> {
    const existing = await conversationWorkflowRepository.findByConversation(
      conversationId,
      'appointment_booking',
    );

    if (existing) {
      if (isWorkflowExpired(existing)) {
        await this.deleteWorkflow(existing.id);
        return this.initBookingWorkflow(conversationId);
      }

      if (existing.workflowState === 'BOOKED' || existing.workflowState === 'CANCELLED') {
        return existing;
      }

      return existing;
    }

    return this.initBookingWorkflow(conversationId);
  }

  /**
   * Merges newly extracted data into the workflow's collectedData
   * and recomputes the workflow state.
   */
  async updateBookingData(
    workflow: ConversationWorkflow,
    updates: Partial<CollectedData>,
    lastAskedField?: string | null,
    servicesCount?: number,
    customer?: Customer,
  ): Promise<ConversationWorkflow> {
    const merged: CollectedData = {
      ...workflow.collectedData,
      ...Object.fromEntries(Object.entries(updates).filter(([_, v]) => v != null)),
    };

    const effectiveServicesCount = servicesCount ?? 1;
    const newState = computeWorkflowState(
      merged,
      effectiveServicesCount,
      customer ?? { name: null, phone: null, email: null } as Customer,
    );

    const newLastAskedField = lastAskedField === null
      ? undefined
      : (lastAskedField ?? workflow.lastAskedField);

    return conversationWorkflowRepository.upsert({
      conversationId: workflow.conversationId,
      workflowType: 'appointment_booking',
      workflowState: newState,
      workflowVersion: workflow.workflowVersion,
      collectedData: merged,
      lastAskedField: newLastAskedField,
      availableSlots: workflow.availableSlots,
      slotsFetchedAt: workflow.slotsFetchedAt,
    });
  }

  /**
   * Fetches actual slot availability and caches it in the workflow.
   */
  async refreshAvailability(
    workflow: ConversationWorkflow,
    businessId: string,
    slotDurationMinutes: number,
    workingHours: { weekday: { start: string; end: string } | null; saturday: { start: string; end: string } | null; sunday: { start: string; end: string } | null },
    tz: string,
  ): Promise<string[]> {
    const date = workflow.collectedData.date;
    if (!date) return [];

    const dayStart = fromBusinessTimeToUtc(tz, date, '00:00');
    const dayEnd = fromBusinessTimeToUtc(tz, date, '23:59');

    const slotsQuery = `
      SELECT appointment_time FROM appointments
      WHERE business_id = $1
        AND appointment_time >= $2
        AND appointment_time < $3
        AND status IN ('pending', 'confirmed')
      ORDER BY appointment_time ASC
    `;
    const bookedRes = await pool.query(slotsQuery, [businessId, dayStart, dayEnd]);
    const bookedTimes = new Set(
      bookedRes.rows.map((r: any) => getTimeStrInTz(tz, new Date(r.appointment_time))),
    );

    const dayOfWeek = getDayOfWeekInTz(tz, date);
    let hours = workingHours.weekday;
    if (dayOfWeek === 6) hours = workingHours.saturday;
    if (dayOfWeek === 0) hours = workingHours.sunday;

    const slots: string[] = [];
    if (hours) {
      const cursor = fromBusinessTimeToUtc(tz, date, hours.start);
      const limit = fromBusinessTimeToUtc(tz, date, hours.end);

      while (cursor < limit) {
        const slotStr = getTimeStrInTz(tz, cursor);
        if (!bookedTimes.has(slotStr)) {
          slots.push(slotStr);
        }
        cursor.setMinutes(cursor.getMinutes() + slotDurationMinutes);
      }
    }

    await conversationWorkflowRepository.upsert({
      conversationId: workflow.conversationId,
      workflowType: 'appointment_booking',
      workflowState: 'CHECKING_AVAILABILITY',
      workflowVersion: workflow.workflowVersion,
      collectedData: workflow.collectedData,
      lastAskedField: workflow.lastAskedField,
      availableSlots: slots,
      slotsFetchedAt: new Date(),
    });

    return slots;
  }

  /**
   * Marks the workflow as booked.
   */
  async markBooked(workflow: ConversationWorkflow): Promise<void> {
    await conversationWorkflowRepository.upsert({
      conversationId: workflow.conversationId,
      workflowType: 'appointment_booking',
      workflowState: 'BOOKED',
      workflowVersion: workflow.workflowVersion,
      collectedData: workflow.collectedData,
      lastAskedField: undefined,
    });
  }

  /**
   * Marks the workflow as cancelled.
   */
  async markCancelled(workflow: ConversationWorkflow): Promise<void> {
    await conversationWorkflowRepository.upsert({
      conversationId: workflow.conversationId,
      workflowType: 'appointment_booking',
      workflowState: 'CANCELLED',
      workflowVersion: workflow.workflowVersion,
      collectedData: workflow.collectedData,
      lastAskedField: undefined,
    });
  }

  async deleteWorkflow(id: string): Promise<void> {
    await conversationWorkflowRepository.delete(id);
  }
}

export const workflowStateService = new WorkflowStateService();
