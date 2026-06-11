import pool from '../config/db';

export interface FounderBusinessRow {
  id: string;
  name: string;
  slug: string;
  businessType: string;
  phone: string | null;
  email: string | null;
  timezone: string;
  createdAt: Date;
  health: 'healthy' | 'attention' | 'critical';
  leadCount: number;
  appointmentCount: number;
  escalationCount: number;
  serviceCount: number;
  faqCount: number;
  planName: string | null;
  planStatus: string | null;
  hasRecentActivity: boolean;
}

export interface FounderLeadRow {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  customerName: string | null;
  email: string | null;
  phone: string | null;
  lifecycleState: string;
  lastInteractionAt: Date | null;
  createdAt: Date;
}

export interface FounderAppointmentRow {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  customerName: string | null;
  serviceName: string | null;
  appointmentTime: Date;
  status: string;
  createdAt: Date;
}

export interface FounderEscalationRow {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  customerName: string | null;
  reason: string;
  status: string;
  createdAt: Date;
}

export interface FounderSubscriptionRow {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  planName: string;
  planType: string;
  status: string;
  amount: number;
  currency: string;
  billingCycle: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date | null;
  trialEnd: Date | null;
  createdAt: Date;
}

export interface FounderOverview {
  totalBusinesses: number;
  activeBusinesses: number;
  leadsToday: number;
  leadsThisWeek: number;
  totalLeads: number;
  appointmentsToday: number;
  appointmentsThisWeek: number;
  pendingEscalations: number;
  monthlyRevenue: number;
  businessesByHealth: { healthy: number; attention: number; critical: number };
}

export interface ActivityEvent {
  type: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  summary: string;
  timestamp: Date;
}

const METRICS_SUBQUERY = `
  (SELECT COUNT(*) FROM customers c WHERE c.business_id = b.id)::int as lead_count,
  (SELECT COUNT(*) FROM appointments a WHERE a.business_id = b.id)::int as appointment_count,
  (SELECT COUNT(*) FROM escalations e WHERE e.business_id = b.id AND e.status = 'pending')::int as escalation_count,
  (SELECT COUNT(*) FROM services s WHERE s.business_id = b.id)::int as service_count,
  (SELECT COUNT(*) FROM jsonb_array_elements(b.faqs))::int as faq_count,
  (SELECT plan_name FROM subscriptions s WHERE s.business_id = b.id AND s.status = 'active' LIMIT 1) as plan_name,
  (SELECT status FROM subscriptions s WHERE s.business_id = b.id AND s.status = 'active' LIMIT 1) as plan_status,
  EXISTS(SELECT 1 FROM appointments a WHERE a.business_id = b.id AND a.created_at >= NOW() - INTERVAL '7 days') as has_recent_activity
`;

export class FounderRepository {
  private computeHealth(b: {
    service_count: number;
    escalation_count: number;
    has_recent_activity: boolean;
    appointment_count: number;
  }): 'healthy' | 'attention' | 'critical' {
    if (b.service_count === 0) return 'critical';
    if (b.escalation_count > 0) return 'critical';
    if (!b.has_recent_activity && b.appointment_count === 0) return 'attention';
    if (!b.has_recent_activity) return 'attention';
    return 'healthy';
  }

  // ─── Overview ───────────────────────────────────────────
  async getOverview(): Promise<FounderOverview> {
    const [totalBizRes, leadsTodayRes, leadsWeekRes, leadsAllRes,
           apptsTodayRes, apptsWeekRes, escalationsRes, revenueRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM businesses`),
      pool.query(`SELECT COUNT(*) as today FROM customers WHERE created_at >= CURRENT_DATE`),
      pool.query(`SELECT COUNT(*) as week FROM customers WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`),
      pool.query(`SELECT COUNT(*) as total FROM customers`),
      pool.query(`SELECT COUNT(*) as today FROM appointments WHERE appointment_time::date = CURRENT_DATE`),
      pool.query(`SELECT COUNT(*) as week FROM appointments WHERE appointment_time >= NOW() - INTERVAL '7 days' AND appointment_time <= NOW() + INTERVAL '7 days'`),
      pool.query(`SELECT COUNT(*) as pending FROM escalations WHERE status = 'pending'`),
      pool.query(`SELECT COALESCE(SUM(amount), 0) as revenue FROM subscriptions WHERE status = 'active'`),
    ]);

    const allBusinesses = await this.listAllBusinessesWithMetrics();
    const healthCounts = { healthy: 0, attention: 0, critical: 0 };
    for (const b of allBusinesses) healthCounts[b.health]++;

    return {
      totalBusinesses: parseInt(totalBizRes.rows[0].total),
      activeBusinesses: parseInt(totalBizRes.rows[0].total),
      leadsToday: parseInt(leadsTodayRes.rows[0].today),
      leadsThisWeek: parseInt(leadsWeekRes.rows[0].week),
      totalLeads: parseInt(leadsAllRes.rows[0].total),
      appointmentsToday: parseInt(apptsTodayRes.rows[0].today),
      appointmentsThisWeek: parseInt(apptsWeekRes.rows[0].week),
      pendingEscalations: parseInt(escalationsRes.rows[0].pending),
      monthlyRevenue: parseFloat(revenueRes.rows[0].revenue),
      businessesByHealth: healthCounts,
    };
  }

  // ─── Businesses ─────────────────────────────────────────
  private async listAllBusinessesWithMetrics(): Promise<FounderBusinessRow[]> {
    const query = `
      SELECT b.id, b.name, b.slug, b.business_type, b.phone, b.email, b.timezone, b.created_at,
             ${METRICS_SUBQUERY}
      FROM businesses b
      ORDER BY b.created_at DESC
    `;
    const res = await pool.query(query);
    return res.rows.map(r => ({ ...r, health: this.computeHealth(r) }));
  }

  async listBusinessesPaginated(params: {
    page: number;
    limit: number;
    search?: string;
    plan?: string;
  }): Promise<{ rows: FounderBusinessRow[]; total: number }> {
    let whereClauses: string[] = [`1=1`];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (params.search) {
      whereClauses.push(`(b.name ILIKE $${paramIdx} OR b.slug ILIKE $${paramIdx})`);
      values.push(`%${params.search}%`);
      paramIdx++;
    }

    const where = whereClauses.join(' AND ');

    const countQuery = `SELECT COUNT(*) FROM businesses b WHERE ${where}`;
    const countRes = await pool.query(countQuery, values);
    const total = parseInt(countRes.rows[0].count);

    const offset = (params.page - 1) * params.limit;
    const query = `
      SELECT b.id, b.name, b.slug, b.business_type, b.phone, b.email, b.timezone, b.created_at,
             ${METRICS_SUBQUERY}
      FROM businesses b
      WHERE ${where}
      ORDER BY b.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    values.push(params.limit, offset);
    const res = await pool.query(query, values);

    let rows = res.rows.map(r => ({ ...r, health: this.computeHealth(r) }));

    if (params.plan) {
      rows = rows.filter(r => r.planName?.toLowerCase() === params.plan!.toLowerCase());
    }

    return { rows, total };
  }

  async getBusinessDetail(id: string): Promise<FounderBusinessRow | null> {
    const query = `
      SELECT b.id, b.name, b.slug, b.business_type, b.phone, b.email, b.timezone, b.created_at,
             ${METRICS_SUBQUERY}
      FROM businesses b
      WHERE b.id = $1
    `;
    const res = await pool.query(query, [id]);
    if (res.rows.length === 0) return null;
    return { ...res.rows[0], health: this.computeHealth(res.rows[0]) };
  }

  async getRecentBusinesses(limit = 5): Promise<FounderBusinessRow[]> {
    const query = `
      SELECT b.id, b.name, b.slug, b.business_type, b.phone, b.email, b.timezone, b.created_at,
             ${METRICS_SUBQUERY}
      FROM businesses b
      ORDER BY b.created_at DESC
      LIMIT $1
    `;
    const res = await pool.query(query, [limit]);
    return res.rows.map(r => ({ ...r, health: this.computeHealth(r) }));
  }

  // ─── Leads ──────────────────────────────────────────────
  async listLeadsPaginated(params: {
    page: number;
    limit: number;
    search?: string;
    businessId?: string;
    status?: string;
  }): Promise<{ rows: FounderLeadRow[]; total: number }> {
    let whereClauses: string[] = [`1=1`];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (params.search) {
      whereClauses.push(`(c.name ILIKE $${paramIdx} OR c.email ILIKE $${paramIdx} OR c.phone ILIKE $${paramIdx})`);
      values.push(`%${params.search}%`);
      paramIdx++;
    }
    if (params.businessId) {
      whereClauses.push(`c.business_id = $${paramIdx}`);
      values.push(params.businessId);
      paramIdx++;
    }
    if (params.status) {
      whereClauses.push(`c.lifecycle_state = $${paramIdx}`);
      values.push(params.status);
      paramIdx++;
    }

    const where = whereClauses.join(' AND ');

    const countRes = await pool.query(`SELECT COUNT(*) FROM customers c WHERE ${where}`, values);
    const total = parseInt(countRes.rows[0].count);

    const offset = (params.page - 1) * params.limit;
    const query = `
      SELECT c.id, c.business_id, c.name as customer_name, c.email, c.phone,
             c.lifecycle_state, c.last_interaction_at, c.created_at,
             b.name as business_name, b.slug as business_slug
      FROM customers c
      JOIN businesses b ON b.id = c.business_id
      WHERE ${where}
      ORDER BY c.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    values.push(params.limit, offset);
    const res = await pool.query(query, values);

    return {
      rows: res.rows.map(r => ({
        id: r.id,
        businessId: r.business_id,
        businessName: r.business_name,
        businessSlug: r.business_slug,
        customerName: r.customer_name,
        email: r.email,
        phone: r.phone,
        lifecycleState: r.lifecycle_state,
        lastInteractionAt: r.last_interaction_at,
        createdAt: r.created_at,
      })),
      total,
    };
  }

  // ─── Appointments ───────────────────────────────────────
  async listAppointmentsPaginated(params: {
    page: number;
    limit: number;
    search?: string;
    businessId?: string;
    status?: string;
  }): Promise<{ rows: FounderAppointmentRow[]; total: number }> {
    let whereClauses: string[] = [`1=1`];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (params.search) {
      whereClauses.push(`(c.name ILIKE $${paramIdx} OR srv.name ILIKE $${paramIdx})`);
      values.push(`%${params.search}%`);
      paramIdx++;
    }
    if (params.businessId) {
      whereClauses.push(`a.business_id = $${paramIdx}`);
      values.push(params.businessId);
      paramIdx++;
    }
    if (params.status) {
      whereClauses.push(`a.status = $${paramIdx}`);
      values.push(params.status);
      paramIdx++;
    }

    const where = whereClauses.join(' AND ');

    const countRes = await pool.query(`SELECT COUNT(*) FROM appointments a LEFT JOIN customers c ON c.id = a.customer_id WHERE ${where}`, values);
    const total = parseInt(countRes.rows[0].count);

    const offset = (params.page - 1) * params.limit;
    const query = `
      SELECT a.id, a.business_id, a.appointment_time, a.status, a.created_at,
             c.name as customer_name, srv.name as service_name,
             b.name as business_name, b.slug as business_slug
      FROM appointments a
      JOIN businesses b ON b.id = a.business_id
      LEFT JOIN customers c ON c.id = a.customer_id
      LEFT JOIN services srv ON srv.id = a.service_id
      WHERE ${where}
      ORDER BY a.appointment_time DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    values.push(params.limit, offset);
    const res = await pool.query(query, values);

    return {
      rows: res.rows.map(r => ({
        id: r.id,
        businessId: r.business_id,
        businessName: r.business_name,
        businessSlug: r.business_slug,
        customerName: r.customer_name,
        serviceName: r.service_name,
        appointmentTime: r.appointment_time,
        status: r.status,
        createdAt: r.created_at,
      })),
      total,
    };
  }

  // ─── Escalations ────────────────────────────────────────
  async listEscalationsPaginated(params: {
    page: number;
    limit: number;
    search?: string;
    businessId?: string;
    status?: string;
  }): Promise<{ rows: FounderEscalationRow[]; total: number }> {
    let whereClauses: string[] = [`1=1`];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (params.search) {
      whereClauses.push(`(e.reason ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx})`);
      values.push(`%${params.search}%`);
      paramIdx++;
    }
    if (params.businessId) {
      whereClauses.push(`e.business_id = $${paramIdx}`);
      values.push(params.businessId);
      paramIdx++;
    }
    if (params.status) {
      whereClauses.push(`e.status = $${paramIdx}`);
      values.push(params.status);
      paramIdx++;
    }

    const where = whereClauses.join(' AND ');

    const countRes = await pool.query(`SELECT COUNT(*) FROM escalations e LEFT JOIN customers c ON c.id = e.customer_id WHERE ${where}`, values);
    const total = parseInt(countRes.rows[0].count);

    const offset = (params.page - 1) * params.limit;
    const query = `
      SELECT e.id, e.business_id, e.reason, e.status, e.created_at,
             c.name as customer_name,
             b.name as business_name, b.slug as business_slug
      FROM escalations e
      JOIN businesses b ON b.id = e.business_id
      LEFT JOIN customers c ON c.id = e.customer_id
      WHERE ${where}
      ORDER BY e.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    values.push(params.limit, offset);
    const res = await pool.query(query, values);

    return {
      rows: res.rows.map(r => ({
        id: r.id,
        businessId: r.business_id,
        businessName: r.business_name,
        businessSlug: r.business_slug,
        customerName: r.customer_name,
        reason: r.reason,
        status: r.status,
        createdAt: r.created_at,
      })),
      total,
    };
  }

  // ─── Subscriptions ──────────────────────────────────────
  async listSubscriptionsPaginated(params: {
    page: number;
    limit: number;
    status?: string;
  }): Promise<{ rows: FounderSubscriptionRow[]; total: number }> {
    let whereClauses: string[] = [`1=1`];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (params.status) {
      whereClauses.push(`sub.status = $${paramIdx}`);
      values.push(params.status);
      paramIdx++;
    }

    const where = whereClauses.join(' AND ');

    const countRes = await pool.query(`SELECT COUNT(*) FROM subscriptions sub WHERE ${where}`, values);
    const total = parseInt(countRes.rows[0].count);

    const offset = (params.page - 1) * params.limit;
    const query = `
      SELECT sub.id, sub.business_id, sub.plan_name, sub.plan_type, sub.status,
             sub.amount, sub.currency, sub.billing_cycle,
             sub.current_period_start, sub.current_period_end, sub.trial_end, sub.created_at,
             b.name as business_name, b.slug as business_slug
      FROM subscriptions sub
      JOIN businesses b ON b.id = sub.business_id
      WHERE ${where}
      ORDER BY sub.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    values.push(params.limit, offset);
    const res = await pool.query(query, values);

    return {
      rows: res.rows.map(r => ({
        id: r.id,
        businessId: r.business_id,
        businessName: r.business_name,
        businessSlug: r.business_slug,
        planName: r.plan_name,
        planType: r.plan_type,
        status: r.status,
        amount: parseFloat(r.amount),
        currency: r.currency,
        billingCycle: r.billing_cycle,
        currentPeriodStart: r.current_period_start,
        currentPeriodEnd: r.current_period_end,
        trialEnd: r.trial_end,
        createdAt: r.created_at,
      })),
      total,
    };
  }

  async createSubscription(data: {
    businessId: string;
    planName: string;
    planType: string;
    amount: number;
    currency: string;
    billingCycle: string;
    trialEnd?: string;
  }): Promise<FounderSubscriptionRow> {
    const query = `
      INSERT INTO subscriptions (business_id, plan_name, plan_type, amount, currency, billing_cycle, trial_end)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const res = await pool.query(query, [
      data.businessId, data.planName, data.planType, data.amount,
      data.currency, data.billingCycle, data.trialEnd || null,
    ]);
    const r = res.rows[0];
    const biz = await pool.query(`SELECT name, slug FROM businesses WHERE id = $1`, [data.businessId]);
    return {
      id: r.id,
      businessId: r.business_id,
      businessName: biz.rows[0]?.name || '',
      businessSlug: biz.rows[0]?.slug || '',
      planName: r.plan_name,
      planType: r.plan_type,
      status: r.status,
      amount: parseFloat(r.amount),
      currency: r.currency,
      billingCycle: r.billing_cycle,
      currentPeriodStart: r.current_period_start,
      currentPeriodEnd: r.current_period_end,
      trialEnd: r.trial_end,
      createdAt: r.created_at,
    };
  }

  async updateSubscription(id: string, data: {
    planName?: string;
    planType?: string;
    status?: string;
    amount?: number;
    billingCycle?: string;
    currentPeriodEnd?: string;
  }): Promise<void> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (data.planName) { sets.push(`plan_name = $${paramIdx++}`); values.push(data.planName); }
    if (data.planType) { sets.push(`plan_type = $${paramIdx++}`); values.push(data.planType); }
    if (data.status) { sets.push(`status = $${paramIdx++}`); values.push(data.status); }
    if (data.amount !== undefined) { sets.push(`amount = $${paramIdx++}`); values.push(data.amount); }
    if (data.billingCycle) { sets.push(`billing_cycle = $${paramIdx++}`); values.push(data.billingCycle); }
    if (data.currentPeriodEnd) { sets.push(`current_period_end = $${paramIdx++}`); values.push(data.currentPeriodEnd); }

    if (sets.length === 0) return;
    sets.push(`updated_at = NOW()`);

    values.push(id);
    const query = `UPDATE subscriptions SET ${sets.join(', ')} WHERE id = $${paramIdx}`;
    await pool.query(query, values);
  }

  // ─── Activity Feed ──────────────────────────────────────
  async listActivity(limit = 20): Promise<ActivityEvent[]> {
    const queries = [
      pool.query(`
        SELECT 'business_created' as type, id as business_id, name as business_name, slug as business_slug,
               name || ' was created' as summary, created_at as timestamp
        FROM businesses ORDER BY created_at DESC LIMIT $1
      `, [limit]),

      pool.query(`
        SELECT 'appointment_booked' as type, a.business_id, b.name as business_name, b.slug as business_slug,
               COALESCE(c.name, 'Someone') || ' booked ' || COALESCE(s.name, 'a service') as summary,
               a.created_at as timestamp
        FROM appointments a
        JOIN businesses b ON b.id = a.business_id
        LEFT JOIN customers c ON c.id = a.customer_id
        LEFT JOIN services s ON s.id = a.service_id
        ORDER BY a.created_at DESC LIMIT $1
      `, [limit]),

      pool.query(`
        SELECT 'escalation_created' as type, e.business_id, b.name as business_name, b.slug as business_slug,
               COALESCE(c.name, 'Someone') || ' needs help: ' || LEFT(e.reason, 80) as summary,
               e.created_at as timestamp
        FROM escalations e
        JOIN businesses b ON b.id = e.business_id
        LEFT JOIN customers c ON c.id = e.customer_id
        ORDER BY e.created_at DESC LIMIT $1
      `, [limit]),

      pool.query(`
        SELECT 'lead_captured' as type, c.business_id, b.name as business_name, b.slug as business_slug,
               COALESCE(c.name, 'Someone') || ' was captured as a lead' as summary,
               c.created_at as timestamp
        FROM customers c
        JOIN businesses b ON b.id = c.business_id
        ORDER BY c.created_at DESC LIMIT $1
      `, [limit]),

      pool.query(`
        SELECT 'subscription_created' as type, sub.business_id, b.name as business_name, b.slug as business_slug,
               b.name || ' subscribed to ' || sub.plan_name as summary,
               sub.created_at as timestamp
        FROM subscriptions sub
        JOIN businesses b ON b.id = sub.business_id
        ORDER BY sub.created_at DESC LIMIT $1
      `, [limit]),

      pool.query(`
        SELECT 'owner_invited' as type, sp.business_id, b.name as business_name, b.slug as business_slug,
               COALESCE(sp.full_name, 'An owner') || ' was invited to ' || b.name as summary,
               sp.created_at as timestamp
        FROM staff_profiles sp
        JOIN businesses b ON b.id = sp.business_id
        ORDER BY sp.created_at DESC LIMIT $1
      `, [limit]),
    ];

    const results = await Promise.all(queries);
    const allEvents: ActivityEvent[] = results.flatMap(r => r.rows.map((row: any) => ({
      type: row.type,
      businessId: row.business_id,
      businessName: row.business_name,
      businessSlug: row.business_slug,
      summary: row.summary,
      timestamp: row.timestamp,
    })));

    allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return allEvents.slice(0, limit);
  }
}

export const founderRepository = new FounderRepository();
export default founderRepository;
