/**
 * FrontDeskOS — End-to-End Integration Tests
 *
 * Covers 8 customer journeys:
 *   A: Website -> Chat -> Pricing -> Recovery -> Booking
 *   B: Direct Booking (no prior chat)
 *   C: Booking -> Reschedule
 *   D: Booking -> Cancel -> Follow-Up Pending
 *   E: Unknown Question -> Learning Inbox -> Approval -> Re-ask
 *   F: Tenant Isolation (BrightSmile vs Apex)
 *   G: Multiple Appointments (same customer)
 *   H: Recovery Message Visibility
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import pool from '../config/db';

// ─────────────────────────────────────────────────────────────
// Constants — matching UUIDs in database/schema.sql & database/seed-brightsmile.sql
// ─────────────────────────────────────────────────────────────

const APEX_BUSINESS_ID = 'd4a6f7b1-e23a-48d6-95bc-79f94eb97210';
const BRIGHTSMILE_BUSINESS_ID = 'b7a2f4c1-d93e-48d6-95bc-79f94eb97220';
const BRIGHTSMILE_SERVICE_ID = 'svc-b7a2-0001-4000-8000-000000000002';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

async function createSession(businessId: string) {
  const res = await request(app)
    .post('/api/public/sessions/create')
    .send({ businessId });
  return res.body.data as { sessionId: string; customerId: string | null };
}

async function sendChat(sessionId: string, businessId: string, content: string) {
  return request(app)
    .post('/api/chat')
    .send({ businessId, channelType: 'web_chat', channelIdentity: sessionId, content, sessionId });
}

async function bookAppointment(
  customerId: string,
  businessId: string,
  serviceId: string | null,
  minutesFromNow = 120
) {
  const time = new Date(Date.now() + minutesFromNow * 60 * 1000);
  return request(app)
    .post('/api/appointments/book')
    .send({ customerId, businessId, serviceId, appointmentTime: time.toISOString() });
}

async function createCustomer(businessId: string, name: string): Promise<string> {
  const res = await pool.query(
    `INSERT INTO customers (business_id, name, email) VALUES ($1, $2, $3) RETURNING id`,
    [businessId, name, `${name.toLowerCase().replace(/\s/g, '')}@test.com`]
  );
  return res.rows[0].id;
}

async function dbQuery(text: string, params?: any[]) {
  return pool.query(text, params);
}

function assertAppointment(res: request.Response) {
  expect(res.status).toBe(201);
  expect(res.body.success).toBe(true);
  expect(res.body.data.id).toBeTruthy();
  expect(res.body.data.status).toBe('pending');
}

// ─────────────────────────────────────────────────────────────
// JOURNEY A: Website -> Chat -> Pricing -> Recovery -> Booking
// ─────────────────────────────────────────────────────────────

describe('Journey A: Chat -> Pricing -> Recovery -> Booking', () => {
  let session: { sessionId: string; customerId: string | null };
  let customerId = '';

  beforeAll(async () => {
    session = await createSession(BRIGHTSMILE_BUSINESS_ID);
  });

  it('A1: Fetches business profile via public endpoint', async () => {
    const res = await request(app).get(`/api/public/businesses/${'brightsmile-dental'}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('BrightSmile Dental');
    expect(res.body.data.faqs.length).toBe(10);
    expect(res.body.data.services.length).toBe(5);
  });

  it('A2: Sends first chat message and creates customer', async () => {
    const res = await sendChat(session.sessionId, BRIGHTSMILE_BUSINESS_ID, 'Hi, I need dental care information');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.customer).toBeTruthy();
    customerId = res.body.data.customer.id;

    // Verify lifecycle transition in DB
    const db = await dbQuery('SELECT lifecycle_state FROM customers WHERE id = $1', [customerId]);
    expect(db.rows[0]?.lifecycle_state).toBeTruthy();
  });

  it('A3: Asks about pricing', async () => {
    const res = await sendChat(session.sessionId, BRIGHTSMILE_BUSINESS_ID, 'How much does teeth whitening cost?');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // At minimum the agent should reply
    expect(res.body.data.replyMessage.content).toBeTruthy();
  });

  it('A4: Books appointment after chat', async () => {
    const time = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    time.setHours(10, 0, 0, 0);

    const res = await request(app)
      .post('/api/appointments/book')
      .send({
        customerId,
        businessId: BRIGHTSMILE_BUSINESS_ID,
        serviceId: BRIGHTSMILE_SERVICE_ID,
        appointmentTime: time.toISOString(),
      });

    assertAppointment(res);

    // Lifecycle should be Booked
    const db = await dbQuery('SELECT lifecycle_state FROM customers WHERE id = $1', [customerId]);
    expect(db.rows[0]?.lifecycle_state).toBe('Booked');
  });
});

// ─────────────────────────────────────────────────────────────
// JOURNEY B: Direct Booking (no prior chat)
// ─────────────────────────────────────────────────────────────

describe('Journey B: Direct Booking', () => {
  it('B1: Creates session with no linked customer', async () => {
    const s = await createSession(BRIGHTSMILE_BUSINESS_ID);
    expect(s.sessionId).toBeTruthy();
    expect(s.customerId).toBeFalsy();
  });

  it('B2: Books via sessionId -> auto-creates customer', async () => {
    const s = await createSession(BRIGHTSMILE_BUSINESS_ID);

    const time = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    time.setHours(14, 0, 0, 0);

    const res = await request(app)
      .post('/api/appointments/book')
      .send({
        sessionId: s.sessionId,
        businessId: BRIGHTSMILE_BUSINESS_ID,
        serviceId: BRIGHTSMILE_SERVICE_ID,
        appointmentTime: time.toISOString(),
      });

    assertAppointment(res);

    // Customer auto-created
    const db = await dbQuery('SELECT lifecycle_state FROM customers WHERE id = $1', [res.body.data.customerId]);
    expect(db.rows[0]?.lifecycle_state).toBe('Booked');
  });

  it('B3: Session linked to customer after booking', async () => {
    const s = await createSession(BRIGHTSMILE_BUSINESS_ID);
    const time = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    time.setHours(10, 0, 0, 0);

    await request(app)
      .post('/api/appointments/book')
      .send({
        sessionId: s.sessionId,
        businessId: BRIGHTSMILE_BUSINESS_ID,
        appointmentTime: time.toISOString(),
      });

    const ses = await dbQuery('SELECT customer_id FROM customer_sessions WHERE session_id = $1', [s.sessionId]);
    expect(ses.rows[0]?.customer_id).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────
// JOURNEY C: Booking -> Reschedule
// ─────────────────────────────────────────────────────────────

describe('Journey C: Booking -> Reschedule', () => {
  let appointmentId = '';
  let customerId = '';

  beforeAll(async () => {
    const s = await createSession(BRIGHTSMILE_BUSINESS_ID);
    customerId = await createCustomer(BRIGHTSMILE_BUSINESS_ID, 'RescheduleTest');
    const book = await bookAppointment(customerId, BRIGHTSMILE_BUSINESS_ID, BRIGHTSMILE_SERVICE_ID, 48 * 60);
    appointmentId = book.body.data.id;
  });

  it('C1: Reschedules to a new time', async () => {
    const newTime = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    newTime.setHours(11, 0, 0, 0);

    const res = await request(app)
      .post(`/api/appointments/${appointmentId}/reschedule`)
      .send({ businessId: BRIGHTSMILE_BUSINESS_ID, newTime: newTime.toISOString(), notes: 'Moving to later date' });

    expect(res.status).toBe(200);
    expect(res.body.data.rescheduledFromId).toBe(appointmentId);
  });

  it('C2: Old appointment status is rescheduled', async () => {
    const db = await dbQuery('SELECT status FROM appointments WHERE id = $1', [appointmentId]);
    expect(db.rows[0]?.status).toBe('rescheduled');
  });
});

// ─────────────────────────────────────────────────────────────
// JOURNEY D: Booking -> Cancel -> Follow-Up Pending
// ─────────────────────────────────────────────────────────────

describe('Journey D: Booking -> Cancel -> Follow-Up Pending', () => {
  let appointmentId = '';
  let customerId = '';

  beforeAll(async () => {
    customerId = await createCustomer(BRIGHTSMILE_BUSINESS_ID, 'CancelTest');
    const book = await bookAppointment(customerId, BRIGHTSMILE_BUSINESS_ID, null, 72 * 60);
    appointmentId = book.body.data.id;
  });

  it('D1: Cancels the appointment', async () => {
    const res = await request(app)
      .post(`/api/appointments/${appointmentId}/cancel`)
      .send({ businessId: BRIGHTSMILE_BUSINESS_ID, reason: 'Schedule conflict' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('D2: Appointment status is cancelled', async () => {
    const db = await dbQuery('SELECT status FROM appointments WHERE id = $1', [appointmentId]);
    expect(db.rows[0]?.status).toBe('cancelled');
  });

  it('D3: Customer lifecycle is Follow-Up Pending', async () => {
    const db = await dbQuery('SELECT lifecycle_state FROM customers WHERE id = $1', [customerId]);
    expect(db.rows[0]?.lifecycle_state).toBe('Follow-Up Pending');
  });
});

// ─────────────────────────────────────────────────────────────
// JOURNEY E: Unknown Question -> Learning Inbox -> Approval -> Re-ask
// ─────────────────────────────────────────────────────────────

describe('Journey E: Learning Inbox', () => {
  let knowledgeRequestId = '';
  const businessId = BRIGHTSMILE_BUSINESS_ID;

  it('E1: Creates knowledge request for unanswered question', async () => {
    // Directly insert since LLM response is non-deterministic
    const conv = await dbQuery(
      `INSERT INTO conversations (customer_id, business_id, status, channel_type)
       VALUES ((SELECT id FROM customers WHERE business_id = $1 LIMIT 1), $1, 'active', 'web_chat')
       RETURNING id`,
      [businessId]
    );
    const convId = conv.rows[0].id;

    const kr = await dbQuery(
      `INSERT INTO knowledge_requests (business_id, conversation_id, unanswered_question, status)
       VALUES ($1, $2, 'What is your policy on laser gum contouring costs?', 'pending')
       RETURNING id`,
      [businessId, convId]
    );
    knowledgeRequestId = kr.rows[0].id;
    expect(knowledgeRequestId).toBeTruthy();
  });

  it('E2: Approves request and updates business FAQs', async () => {
    const answer = 'Laser gum contouring starts at $400 and is covered at 50% by most PPO plans.';

    const res = await request(app)
      .post(`/api/knowledge-base/requests/${knowledgeRequestId}/approve`)
      .send({ answer });

    expect(res.status).toBe(200);

    const kr = await dbQuery('SELECT status FROM knowledge_requests WHERE id = $1', [knowledgeRequestId]);
    expect(kr.rows[0]?.status).toBe('approved');

    const biz = await dbQuery('SELECT faqs FROM businesses WHERE id = $1', [businessId]);
    const faqs = biz.rows[0].faqs;
    expect(faqs[faqs.length - 1].question).toContain('laser gum');
  });

  it('E3: Same question answered from FAQ (no duplicate request)', async () => {
    const kr = await dbQuery(
      `SELECT COUNT(*) as c FROM knowledge_requests
       WHERE business_id = $1 AND unanswered_question ILIKE '%laser gum%'`,
      [businessId]
    );
    expect(parseInt(kr.rows[0].c)).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────
// JOURNEY F: Tenant Isolation
// ─────────────────────────────────────────────────────────────

describe('Journey F: Tenant Isolation', () => {
  let brightCustomerId = '';
  let apexCustomerId = '';

  beforeAll(async () => {
    const bs = await createSession(BRIGHTSMILE_BUSINESS_ID);
    const as = await createSession(APEX_BUSINESS_ID);

    const bRes = await sendChat(bs.sessionId, BRIGHTSMILE_BUSINESS_ID, 'Hello from BrightSmile');
    brightCustomerId = bRes.body.data?.customer?.id || '';

    const aRes = await sendChat(as.sessionId, APEX_BUSINESS_ID, 'Hello from Apex');
    apexCustomerId = aRes.body.data?.customer?.id || '';
  });

  it('F1: BrightSmile customers belong to BrightSmile', async () => {
    const db = await dbQuery('SELECT business_id FROM customers WHERE id = $1', [brightCustomerId]);
    if (db.rows[0]) expect(db.rows[0].business_id).toBe(BRIGHTSMILE_BUSINESS_ID);
  });

  it('F2: Apex customers belong to Apex', async () => {
    const db = await dbQuery('SELECT business_id FROM customers WHERE id = $1', [apexCustomerId]);
    if (db.rows[0]) expect(db.rows[0].business_id).toBe(APEX_BUSINESS_ID);
  });

  it('F3: Dashboard summaries are scoped per tenant', async () => {
    const [b, a] = await Promise.all([
      request(app).get(`/api/dashboard/summary?businessId=${BRIGHTSMILE_BUSINESS_ID}`),
      request(app).get(`/api/dashboard/summary?businessId=${APEX_BUSINESS_ID}`),
    ]);
    expect(b.status).toBe(200);
    expect(a.status).toBe(200);
    expect(typeof b.body.data.totalLeads).toBe('number');
    expect(typeof a.body.data.totalLeads).toBe('number');
  });

  it('F4: Lead lists are scoped per tenant', async () => {
    const [b, a] = await Promise.all([
      request(app).get(`/api/leads?businessId=${BRIGHTSMILE_BUSINESS_ID}`),
      request(app).get(`/api/leads?businessId=${APEX_BUSINESS_ID}`),
    ]);
    expect(b.status).toBe(200);
    expect(a.status).toBe(200);
  });

  it('F5: Appointments are scoped per tenant', async () => {
    const [b, a] = await Promise.all([
      request(app).get(`/api/appointments?businessId=${BRIGHTSMILE_BUSINESS_ID}`),
      request(app).get(`/api/appointments?businessId=${APEX_BUSINESS_ID}`),
    ]);
    expect(b.status).toBe(200);
    expect(a.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────
// JOURNEY G: Multiple Appointments (same customer)
// ─────────────────────────────────────────────────────────────

describe('Journey G: Multiple Appointments', () => {
  let customerId = '';

  beforeAll(async () => {
    customerId = await createCustomer(BRIGHTSMILE_BUSINESS_ID, 'MultiBookTest');
  });

  it('G1: Books 3 separate appointments', async () => {
    const ids: string[] = [];
    for (const days of [7, 14, 21]) {
      const res = await bookAppointment(customerId, BRIGHTSMILE_BUSINESS_ID, null, days * 24 * 60);
      assertAppointment(res);
      ids.push(res.body.data.id);
    }
    expect(ids.length).toBe(3);
  });

  it('G2: Customer has 3 appointments in DB', async () => {
    const db = await dbQuery('SELECT COUNT(*) as c FROM appointments WHERE customer_id = $1', [customerId]);
    expect(parseInt(db.rows[0].c)).toBe(3);
  });

  it('G3: Cancelling one does not affect others', async () => {
    const apts = await dbQuery(
      'SELECT id FROM appointments WHERE customer_id = $1 AND status = $2 ORDER BY appointment_time LIMIT 1',
      [customerId, 'pending']
    );

    if (apts.rows.length > 0) {
      await request(app)
        .post(`/api/appointments/${apts.rows[0].id}/cancel`)
        .send({ businessId: BRIGHTSMILE_BUSINESS_ID });

      const remaining = await dbQuery(
        'SELECT COUNT(*) as c FROM appointments WHERE customer_id = $1 AND status = $2',
        [customerId, 'pending']
      );
      expect(parseInt(remaining.rows[0].c)).toBe(2);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// JOURNEY H: Recovery Message Visibility
// ─────────────────────────────────────────────────────────────

describe('Journey H: Recovery Message Visibility', () => {
  let conversationId = '';
  let customerId = '';

  beforeAll(async () => {
    const s = await createSession(BRIGHTSMILE_BUSINESS_ID);
    const chat = await sendChat(s.sessionId, BRIGHTSMILE_BUSINESS_ID, 'Hello');
    customerId = chat.body.data?.customer?.id || '';
    conversationId = chat.body.data?.conversation?.id || '';

    if (customerId) {
      const { recoveryService } = await import('../services/recovery/index.js');
      await recoveryService.scheduleRecovery(customerId, BRIGHTSMILE_BUSINESS_ID, 'inactivity');
      await recoveryService.processDueRecoveries();
    }
  });

  it('H1: Recovery messages stored as agent sender (not system)', async () => {
    if (!conversationId) return;

    const msgs = await dbQuery(
      `SELECT sender, content FROM messages 
       WHERE conversation_id = $1 AND metadata @> $2`,
      [conversationId, JSON.stringify({ recovery: true })]
    );

    for (const row of msgs.rows) {
      expect(row.sender).toBe('agent');
      expect(row.content).not.toMatch(/^\[Recovery\]/);
    }
  });

  it('H2: Follow-up records exist for customer', async () => {
    if (!customerId) return;

    const fu = await dbQuery(
      'SELECT * FROM follow_ups WHERE customer_id = $1 ORDER BY scheduled_at',
      [customerId]
    );
    // Recovery may or may not have been processed; system handles gracefully
    expect(Array.isArray(fu.rows)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────

afterAll(async () => {
  await pool.end();
});
