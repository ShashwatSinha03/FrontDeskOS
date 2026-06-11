import pool from '../config/db';

export interface SubscriptionCapabilities {
  status: string;
  canViewDashboard: boolean;
  canMutateData: boolean;
  canUseAI: boolean;
  canUseBooking: boolean;
  canCaptureLeads: boolean;
}

interface SubscriptionRow {
  id: string;
  business_id: string;
  plan_name: string;
  plan_type: string;
  status: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  current_period_start: Date;
  current_period_end: Date | null;
  trial_end: Date | null;
  billing_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  active: ['past_due', 'suspended', 'cancelled'],
  past_due: ['active', 'suspended', 'cancelled'],
  suspended: ['active', 'cancelled'],
  cancelled: ['active'],
};

function buildCapabilities(status: string): SubscriptionCapabilities {
  const cap = {
    status,
    canViewDashboard: true,
    canMutateData: true,
    canUseAI: true,
    canUseBooking: true,
    canCaptureLeads: true,
  };

  if (status === 'suspended' || status === 'cancelled') {
    cap.canMutateData = false;
    cap.canUseAI = false;
    cap.canUseBooking = false;
    cap.canCaptureLeads = false;
  }

  return cap;
}

class SubscriptionService {
  async getSubscriptionStatus(businessId: string): Promise<SubscriptionRow | null> {
    const res = await pool.query(
      `SELECT * FROM subscriptions WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [businessId]
    );
    return res.rows[0] || null;
  }

  async getSubscriptionCapabilities(businessId: string): Promise<SubscriptionCapabilities> {
    const sub = await this.getSubscriptionStatus(businessId);
    if (!sub) {
      return buildCapabilities('active');
    }
    return buildCapabilities(sub.status);
  }

  async updateSubscriptionStatus(
    subscriptionId: string,
    newStatus: string,
    userId?: string,
    note?: string
  ): Promise<{ success: boolean; error?: string }> {
    const res = await pool.query(
      `SELECT id, business_id, status FROM subscriptions WHERE id = $1`,
      [subscriptionId]
    );
    if (res.rows.length === 0) {
      return { success: false, error: 'Subscription not found' };
    }

    const sub = res.rows[0];
    const allowed = VALID_TRANSITIONS[sub.status];
    if (!allowed || !allowed.includes(newStatus)) {
      return {
        success: false,
        error: `Cannot transition from '${sub.status}' to '${newStatus}'. Allowed: ${(allowed || []).join(', ') || 'none'}`,
      };
    }

    await pool.query(
      `UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2`,
      [newStatus, subscriptionId]
    );

    await this.logBillingEvent({
      subscriptionId,
      businessId: sub.business_id,
      eventType: 'status_changed',
      previousStatus: sub.status,
      newStatus,
      note: note || null,
      createdBy: userId || null,
    });

    return { success: true };
  }

  async logBillingEvent(params: {
    subscriptionId: string;
    businessId: string;
    eventType: string;
    previousStatus?: string | null;
    newStatus?: string | null;
    note?: string | null;
    createdBy?: string | null;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO billing_events (subscription_id, business_id, event_type, previous_status, new_status, note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        params.subscriptionId,
        params.businessId,
        params.eventType,
        params.previousStatus || null,
        params.newStatus || null,
        params.note || null,
        params.createdBy || null,
      ]
    );
  }

  async getBillingHistory(subscriptionId: string) {
    const res = await pool.query(
      `SELECT * FROM billing_events
       WHERE subscription_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [subscriptionId]
    );
    return res.rows;
  }

  async getSubscriptionHealth(): Promise<{
    mrr: number;
    activeCount: number;
    pastDueCount: number;
    suspendedCount: number;
    cancelledCount: number;
    totalCount: number;
    statusDistribution: Record<string, number>;
  }> {
    const res = await pool.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0) as mrr,
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(*) FILTER (WHERE status = 'past_due') as past_due_count,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COUNT(*) as total_count,
        jsonb_object_agg(COALESCE(status, 'unknown'), cnt) as distribution
      FROM (
        SELECT DISTINCT ON (business_id) status, amount, COUNT(*) OVER (PARTITION BY status) as cnt
        FROM subscriptions
        ORDER BY business_id, created_at DESC
      ) latest
    `);
    const row = res.rows[0];
    return {
      mrr: parseFloat(row.mrr),
      activeCount: parseInt(row.active_count),
      pastDueCount: parseInt(row.past_due_count),
      suspendedCount: parseInt(row.suspended_count),
      cancelledCount: parseInt(row.cancelled_count),
      totalCount: parseInt(row.total_count),
      statusDistribution: row.distribution || {},
    };
  }

  async updateBillingNotes(subscriptionId: string, notes: string): Promise<void> {
    await pool.query(
      `UPDATE subscriptions SET billing_notes = $1, updated_at = NOW() WHERE id = $2`,
      [notes, subscriptionId]
    );
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
