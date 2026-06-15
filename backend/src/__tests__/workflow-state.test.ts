import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  computeWorkflowState,
  getMissingCustomerDetails,
  getMissingBookingFields,
  formatMissingFieldsHint,
  isWorkflowExpired,
  areSlotsValid,
  getNextFieldToAsk,
  isDirectAnswerToLastField,
  extractFieldValue,
  WORKFLOW_TIMEOUT_HOURS,
  SLOTS_CACHE_TTL_MINUTES,
} from '../services/workflow-state.service';
import type { CollectedData, Customer, ConversationWorkflow, WorkflowState } from '../types';

const defaultCustomer: Customer = {
  id: '00000000-0000-0000-0000-000000000001',
  businessId: '00000000-0000-0000-0000-000000000010',
  name: null,
  email: null,
  phone: null,
  lifecycleState: 'New Inquiry',
  lastInteractionAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockWorkflow = (overrides: Partial<ConversationWorkflow> = {}): ConversationWorkflow => ({
  id: 'wf-001',
  conversationId: 'conv-001',
  workflowType: 'appointment_booking',
  workflowState: 'STARTED',
  workflowVersion: 1,
  collectedData: {},
  lastUpdatedAt: new Date(),
  createdAt: new Date(),
  ...overrides,
});

describe('computeWorkflowState', () => {
  it('returns COLLECTING_SERVICE when no serviceId and servicesCount > 1', () => {
    expect(computeWorkflowState({}, 3, defaultCustomer)).toBe('COLLECTING_SERVICE');
  });

  it('skips COLLECTING_SERVICE when servicesCount is 1', () => {
    expect(computeWorkflowState({}, 1, defaultCustomer)).toBe('COLLECTING_DATE');
  });

  it('returns COLLECTING_DATE when serviceId present but no date', () => {
    expect(computeWorkflowState({ serviceId: 'svc-1' }, 3, defaultCustomer)).toBe('COLLECTING_DATE');
  });

  it('returns COLLECTING_TIME when date present but no time', () => {
    expect(computeWorkflowState({ serviceId: 'svc-1', date: '2026-06-20' }, 1, defaultCustomer)).toBe('COLLECTING_TIME');
  });

  it('returns COLLECTING_CUSTOMER_DETAILS when customer details missing', () => {
    const state = computeWorkflowState(
      { serviceId: 'svc-1', date: '2026-06-20', time: '14:00' },
      1,
      defaultCustomer,
    );
    expect(state).toBe('COLLECTING_CUSTOMER_DETAILS');
  });

  it('returns CHECKING_AVAILABILITY when all data collected', () => {
    const state = computeWorkflowState(
      { serviceId: 'svc-1', date: '2026-06-20', time: '14:00', customerName: 'John' },
      1,
      { ...defaultCustomer, phone: '555-0000', email: 'john@test.com' },
    );
    expect(state).toBe('CHECKING_AVAILABILITY');
  });

  it('returns CHECKING_AVAILABILITY when customer already has all details', () => {
    const customerWithDetails: Customer = {
      ...defaultCustomer,
      name: 'Jane Doe',
      phone: '555-1234',
      email: 'jane@example.com',
    };
    expect(computeWorkflowState(
      { serviceId: 'svc-1', date: '2026-06-20', time: '10:00' },
      1,
      customerWithDetails,
    )).toBe('CHECKING_AVAILABILITY');
  });
});

describe('getMissingCustomerDetails', () => {
  it('returns all missing fields when customer has no details', () => {
    const missing = getMissingCustomerDetails({}, defaultCustomer);
    expect(missing).toContain('customerName');
    expect(missing).toContain('customerPhone');
    expect(missing).toContain('customerEmail');
  });

  it('excludes fields already on customer profile', () => {
    const customer: Customer = { ...defaultCustomer, name: 'John', phone: '555-0000' };
    const missing = getMissingCustomerDetails({}, customer);
    expect(missing).not.toContain('customerName');
    expect(missing).not.toContain('customerPhone');
    expect(missing).toContain('customerEmail');
  });

  it('excludes fields already collected', () => {
    const missing = getMissingCustomerDetails(
      { customerName: 'John', customerPhone: '555-0000' },
      defaultCustomer,
    );
    expect(missing).not.toContain('customerName');
    expect(missing).not.toContain('customerPhone');
    expect(missing).toContain('customerEmail');
  });

  it('prefers collected data over customer profile', () => {
    const customer: Customer = { ...defaultCustomer, name: 'Old Name' };
    const missing = getMissingCustomerDetails({ customerName: 'New Name' }, customer);
    expect(missing).not.toContain('customerName');
  });

  it('returns empty array when all details present', () => {
    const customer: Customer = {
      ...defaultCustomer,
      name: 'John',
      phone: '555-0000',
      email: 'john@test.com',
    };
    expect(getMissingCustomerDetails({}, customer)).toEqual([]);
  });
});

describe('getMissingBookingFields', () => {
  it('returns ["service"] for COLLECTING_SERVICE state', () => {
    expect(getMissingBookingFields({}, 3, defaultCustomer)).toEqual(['service']);
  });

  it('returns ["date"] for COLLECTING_DATE state', () => {
    expect(getMissingBookingFields(
      { serviceId: 'svc-1' }, 1, defaultCustomer,
    )).toEqual(['date']);
  });

  it('returns ["time"] for COLLECTING_TIME state', () => {
    expect(getMissingBookingFields(
      { serviceId: 'svc-1', date: '2026-06-20' }, 1, defaultCustomer,
    )).toEqual(['time']);
  });

  it('returns customer detail fields for COLLECTING_CUSTOMER_DETAILS state', () => {
    const missing = getMissingBookingFields(
      { serviceId: 'svc-1', date: '2026-06-20', time: '14:00' },
      1,
      defaultCustomer,
    );
    expect(missing).toContain('customerName');
    expect(missing).toContain('customerPhone');
    expect(missing).toContain('customerEmail');
  });

  it('returns empty array for CHECKING_AVAILABILITY state', () => {
    const customer: Customer = { ...defaultCustomer, name: 'John', phone: '555-0000', email: 'john@test.com' };
    expect(getMissingBookingFields(
      { serviceId: 'svc-1', date: '2026-06-20', time: '14:00', customerName: 'John' },
      1,
      customer,
    )).toEqual([]);
  });
});

describe('formatMissingFieldsHint', () => {
  it('returns comma-separated human readable labels', () => {
    expect(formatMissingFieldsHint(['service', 'date', 'time']))
      .toBe('service type, preferred date, preferred time');
  });

  it('returns empty string for empty array', () => {
    expect(formatMissingFieldsHint([])).toBe('');
  });

  it('handles mixed booking and customer fields', () => {
    const hint = formatMissingFieldsHint(['customerName', 'customerPhone']);
    expect(hint).toBe('your name, your phone number');
  });

  it('falls back to raw field name for unknown fields', () => {
    expect(formatMissingFieldsHint(['unknown_field'])).toBe('unknown_field');
  });
});

describe('isWorkflowExpired', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false for a recently updated workflow', () => {
    vi.setSystemTime(new Date('2026-06-14T12:00:00Z'));
    const wf = mockWorkflow({ lastUpdatedAt: new Date('2026-06-14T11:00:00Z') });
    expect(isWorkflowExpired(wf)).toBe(false);
  });

  it('returns true for a workflow older than WORKFLOW_TIMEOUT_HOURS', () => {
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    const oldDate = new Date('2026-06-14T11:00:00Z');
    const wf = mockWorkflow({ lastUpdatedAt: oldDate });
    expect(isWorkflowExpired(wf)).toBe(true);
  });

  it('returns false exactly at the timeout boundary', () => {
    vi.setSystemTime(new Date('2026-06-14T12:00:00Z'));
    const boundary = new Date('2026-06-13T12:00:00Z');
    const wf = mockWorkflow({ lastUpdatedAt: boundary });
    expect(isWorkflowExpired(wf)).toBe(false);
  });
});

describe('areSlotsValid', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false when no slotsFetchedAt', () => {
    expect(areSlotsValid(mockWorkflow())).toBe(false);
  });

  it('returns false when no availableSlots', () => {
    const wf = mockWorkflow({ slotsFetchedAt: new Date() });
    expect(areSlotsValid(wf)).toBe(false);
  });

  it('returns true for recently fetched slots', () => {
    vi.setSystemTime(new Date('2026-06-14T12:00:00Z'));
    const wf = mockWorkflow({
      availableSlots: ['09:00', '10:00'],
      slotsFetchedAt: new Date('2026-06-14T11:55:00Z'),
    });
    expect(areSlotsValid(wf)).toBe(true);
  });

  it('returns false for expired slots (past TTL)', () => {
    vi.setSystemTime(new Date('2026-06-14T12:00:00Z'));
    const wf = mockWorkflow({
      availableSlots: ['09:00'],
      slotsFetchedAt: new Date('2026-06-14T11:30:00Z'),
    });
    expect(areSlotsValid(wf)).toBe(false);
  });
});

describe('getNextFieldToAsk', () => {
  it('returns undefined when no missing fields', () => {
    expect(getNextFieldToAsk([])).toBeUndefined();
    expect(getNextFieldToAsk([], 'date')).toBeUndefined();
  });

  it('returns the first field when no lastAskedField', () => {
    expect(getNextFieldToAsk(['service', 'date', 'time'])).toBe('service');
  });

  it('returns the next field after lastAskedField', () => {
    expect(getNextFieldToAsk(['service', 'date', 'time'], 'service')).toBe('date');
    expect(getNextFieldToAsk(['service', 'date', 'time'], 'date')).toBe('time');
  });

  it('wraps around to the first field after the last field', () => {
    const fields = ['service', 'date', 'time'];
    expect(getNextFieldToAsk(fields, 'time')).toBe('service');
  });

  it('returns first field when lastAskedField is not in missing list', () => {
    expect(getNextFieldToAsk(['service', 'date'], 'customerName')).toBe('service');
  });

  it('handles single-field list', () => {
    expect(getNextFieldToAsk(['date'], 'date')).toBe('date');
    expect(getNextFieldToAsk(['date'])).toBe('date');
  });
});

describe('isDirectAnswerToLastField', () => {
  describe('date field', () => {
    it('detects YYYY-MM-DD format', () => {
      expect(isDirectAnswerToLastField('2026-06-20', 'date')).toBe(true);
    });

    it('detects "today"', () => {
      expect(isDirectAnswerToLastField('today', 'date')).toBe(true);
    });

    it('detects "tomorrow"', () => {
      expect(isDirectAnswerToLastField('tomorrow', 'date')).toBe(true);
    });

    it('detects relative day', () => {
      expect(isDirectAnswerToLastField('next Monday', 'date')).toBe(true);
    });

    it('detects MM/DD format', () => {
      expect(isDirectAnswerToLastField('06/20', 'date')).toBe(true);
    });

    it('rejects random words', () => {
      expect(isDirectAnswerToLastField('hello there', 'date')).toBe(false);
    });
  });

  describe('time field', () => {
    it('detects "2pm"', () => {
      expect(isDirectAnswerToLastField('2pm', 'time')).toBe(true);
    });

    it('detects "14:30"', () => {
      expect(isDirectAnswerToLastField('14:30', 'time')).toBe(true);
    });

    it('detects "2:00 PM"', () => {
      expect(isDirectAnswerToLastField('2:00 PM', 'time')).toBe(true);
    });

    it('detects "10 am"', () => {
      expect(isDirectAnswerToLastField('10 am', 'time')).toBe(true);
    });

    it('rejects non-time text', () => {
      expect(isDirectAnswerToLastField('hello', 'time')).toBe(false);
    });
  });

  describe('service field', () => {
    it('detects meaningful service input', () => {
      expect(isDirectAnswerToLastField('Teeth Cleaning', 'service')).toBe(true);
    });

    it('rejects greeting words', () => {
      expect(isDirectAnswerToLastField('hi', 'service')).toBe(false);
      expect(isDirectAnswerToLastField('hello', 'service')).toBe(false);
      expect(isDirectAnswerToLastField('hey', 'service')).toBe(false);
    });

    it('rejects short input', () => {
      expect(isDirectAnswerToLastField('ok', 'service')).toBe(false);
    });

    it('rejects question words', () => {
      expect(isDirectAnswerToLastField('what', 'service')).toBe(false);
      expect(isDirectAnswerToLastField('how', 'service')).toBe(false);
    });
  });

  describe('customerName field', () => {
    it('detects a valid name', () => {
      expect(isDirectAnswerToLastField('John Smith', 'customerName')).toBe(true);
      expect(isDirectAnswerToLastField("Mary O'Brien", 'customerName')).toBe(true);
    });

    it('rejects single character', () => {
      expect(isDirectAnswerToLastField('J', 'customerName')).toBe(false);
    });

    it('rejects numeric input', () => {
      expect(isDirectAnswerToLastField('12345', 'customerName')).toBe(false);
    });
  });

  describe('customerPhone field', () => {
    it('detects phone numbers', () => {
      expect(isDirectAnswerToLastField('555-123-4567', 'customerPhone')).toBe(true);
      expect(isDirectAnswerToLastField('+1 555 123 4567', 'customerPhone')).toBe(true);
      expect(isDirectAnswerToLastField('1234567890', 'customerPhone')).toBe(true);
    });

    it('rejects short input', () => {
      expect(isDirectAnswerToLastField('123', 'customerPhone')).toBe(false);
    });

    it('rejects text input', () => {
      expect(isDirectAnswerToLastField('my phone', 'customerPhone')).toBe(false);
    });
  });

  describe('unknown field', () => {
    it('returns false for unhandled field type', () => {
      expect(isDirectAnswerToLastField('anything', 'unknown_field')).toBe(false);
    });
  });
});

describe('extractFieldValue', () => {
  const tz = 'America/New_York';

  describe('date field', () => {
    it('extracts YYYY-MM-DD directly', () => {
      expect(extractFieldValue('2026-06-20', 'date', tz)).toBe('2026-06-20');
    });

    it('extracts YYYY-MM-DD from context', () => {
      expect(extractFieldValue('I want 2026-06-20 please', 'date', tz)).toBe('2026-06-20');
    });

    it('returns undefined for non-date input', () => {
      expect(extractFieldValue('hello', 'date', tz)).toBeUndefined();
    });
  });

  describe('time field', () => {
    it('extracts "2pm"', () => {
      expect(extractFieldValue('2pm', 'time', tz)).toBe('14:00');
    });

    it('extracts "2:00 PM"', () => {
      expect(extractFieldValue('2:00 PM', 'time', tz)).toBe('14:00');
    });

    it('extracts "14:30"', () => {
      expect(extractFieldValue('14:30', 'time', tz)).toBe('14:30');
    });

    it('extracts "10 am"', () => {
      expect(extractFieldValue('10 am', 'time', tz)).toBe('10:00');
    });

    it('handles 12am (midnight)', () => {
      expect(extractFieldValue('12:00 am', 'time', tz)).toBe('00:00');
    });

    it('handles 12pm (noon)', () => {
      expect(extractFieldValue('12:00 pm', 'time', tz)).toBe('12:00');
    });

    it('returns undefined for non-time input', () => {
      expect(extractFieldValue('hello', 'time', tz)).toBeUndefined();
    });
  });

  describe('other fields', () => {
    it('returns undefined for unhandled field type', () => {
      expect(extractFieldValue('anything', 'customerName', tz)).toBeUndefined();
    });
  });
});
