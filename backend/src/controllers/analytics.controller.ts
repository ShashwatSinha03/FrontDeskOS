import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/db';

export class AnalyticsController {
  async overview(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;

      const [leadsRow, apptsRow, escsRow] = await Promise.all([
        pool.query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE lifecycle_state IN ('Qualified', 'Booking Opportunity', 'Booked', 'Customer'))::int AS qualified,
            COUNT(*) FILTER (WHERE lifecycle_state IN ('Booked', 'Customer'))::int AS won,
            COUNT(*) FILTER (WHERE lifecycle_state = 'Lost')::int AS lost
          FROM customers WHERE business_id = $1
        `, [businessId]),
        pool.query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
            COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
          FROM appointments WHERE business_id = $1
        `, [businessId]),
        pool.query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved
          FROM escalations WHERE business_id = $1
        `, [businessId]),
      ]);

      const leads = leadsRow.rows[0];
      const appts = apptsRow.rows[0];
      const escs = escsRow.rows[0];

      res.json({
        success: true,
        data: {
          leads: {
            total: leads.total,
            qualified: leads.qualified,
            won: leads.won,
            lost: leads.lost,
            conversionRate: leads.total > 0 ? Math.round((leads.won / leads.total) * 100) : 0,
          },
          appointments: {
            total: appts.total,
            completed: appts.completed,
            cancelled: appts.cancelled,
            completionRate: appts.total > 0 ? Math.round((appts.completed / appts.total) * 100) : 0,
          },
          escalations: {
            total: escs.total,
            resolved: escs.resolved,
            resolutionRate: escs.total > 0 ? Math.round((escs.resolved / escs.total) * 100) : 0,
          },
        },
      });
    } catch (error) {
      console.error('[Analytics] Overview error:', error);
      res.status(500).json({ success: false, error: 'Failed to load analytics overview' });
    }
  }

  async services(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;

      const result = await pool.query(`
        SELECT
          s.id AS service_id,
          s.name AS service_name,
          COUNT(a.id)::int AS bookings,
          COUNT(a.id) FILTER (WHERE a.status = 'completed')::int AS completed,
          COUNT(a.id) FILTER (WHERE a.status = 'cancelled')::int AS cancelled
        FROM services s
        LEFT JOIN appointments a ON a.service_id = s.id AND a.business_id = s.business_id
        WHERE s.business_id = $1
        GROUP BY s.id, s.name
        ORDER BY bookings DESC
      `, [businessId]);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('[Analytics] Services error:', error);
      res.status(500).json({ success: false, error: 'Failed to load service analytics' });
    }
  }

  async trends(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;
      const schema = z.object({ range: z.string().default('30d') });
      const { range } = schema.parse(req.query);

      const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;

      const result = await pool.query(`
        SELECT
          d.date::date,
          COALESCE(l.lead_count, 0)::int AS leads,
          COALESCE(a.appt_count, 0)::int AS appointments,
          COALESCE(a.completed_count, 0)::int AS completed_appointments
        FROM generate_series(
          CURRENT_DATE - $2::int, CURRENT_DATE, '1 day'
        ) d(date)
        LEFT JOIN (
          SELECT created_at::date AS date, COUNT(*)::int AS lead_count
          FROM customers WHERE business_id = $1 AND created_at >= CURRENT_DATE - $2::int
          GROUP BY created_at::date
        ) l ON l.date = d.date
        LEFT JOIN (
          SELECT appointment_time::date AS date,
            COUNT(*)::int AS appt_count,
            COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count
          FROM appointments WHERE business_id = $1 AND appointment_time >= CURRENT_DATE - $2::int
          GROUP BY appointment_time::date
        ) a ON a.date = d.date
        ORDER BY d.date ASC
      `, [businessId, days]);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('[Analytics] Trends error:', error);
      res.status(500).json({ success: false, error: 'Failed to load trends' });
    }
  }

  async funnel(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;

      const result = await pool.query(`
        SELECT lifecycle_state, COUNT(*)::int AS count
        FROM customers
        WHERE business_id = $1
        GROUP BY lifecycle_state
      `, [businessId]);

      const funnel = { new: 0, contacted: 0, qualified: 0, won: 0, lost: 0 };
      for (const row of result.rows) {
        const state = row.lifecycle_state as string;
        if (state === 'New Inquiry' || state === 'Information Gathering') funnel.new += row.count;
        else if (state === 'Qualified') funnel.qualified += row.count;
        else if (state === 'Booking Opportunity' || state === 'Follow-Up Pending' || state === 'Escalated') funnel.contacted += row.count;
        else if (state === 'Booked' || state === 'Customer') funnel.won += row.count;
        else if (state === 'Lost') funnel.lost += row.count;
      }

      res.json({ success: true, data: funnel });
    } catch (error) {
      console.error('[Analytics] Funnel error:', error);
      res.status(500).json({ success: false, error: 'Failed to load funnel' });
    }
  }
}

export const analyticsController = new AnalyticsController();
