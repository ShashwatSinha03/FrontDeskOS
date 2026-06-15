import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import pool from '../config/db';
import config from '../config';
import { logger } from '../lib/logger';

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(randomBytes(length), (b) => chars[b % chars.length]).join('');
}

export class FounderController {
  async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const [bizCount, ownerCount, staffCount, recentBiz] = await Promise.all([
        pool.query('SELECT COUNT(*)::int AS count FROM businesses'),
        pool.query(`SELECT COUNT(*)::int AS count FROM staff_profiles WHERE role = 'owner'`),
        pool.query(`SELECT COUNT(*)::int AS count FROM staff_profiles WHERE role = 'staff'`),
        pool.query(`
          SELECT b.id, b.name, b.slug, b.created_at, b.status,
            sp.full_name AS owner_name, p.email AS owner_email
          FROM businesses b
          LEFT JOIN staff_profiles sp ON sp.business_id = b.id AND sp.role = 'owner'
          LEFT JOIN profiles p ON p.id = sp.user_id
          ORDER BY b.created_at DESC
          LIMIT 10
        `),
      ]);

      res.json({
        success: true,
        data: {
          totalBusinesses: bizCount.rows[0].count,
          totalOwners: ownerCount.rows[0].count,
          totalStaff: staffCount.rows[0].count,
          recentBusinesses: recentBiz.rows,
        },
      });
    } catch (error) {
      logger.error('Failed to load overview', { route: 'Founder', error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to load overview' });
    }
  }

  async getBusinesses(req: Request, res: Response): Promise<void> {
    try {
      const search = req.query.search as string;
      let query = `
        SELECT b.id, b.name, b.slug, b.created_at, b.status,
          sp.full_name AS owner_name, p.email AS owner_email
        FROM businesses b
        LEFT JOIN staff_profiles sp ON sp.business_id = b.id AND sp.role = 'owner'
        LEFT JOIN profiles p ON p.id = sp.user_id
      `;
      const params: unknown[] = [];

      if (search) {
        query += ` WHERE b.name ILIKE $1 OR b.slug ILIKE $1 OR p.email ILIKE $1`;
        params.push(`%${search}%`);
      }

      query += ` ORDER BY b.created_at DESC`;

      const result = await pool.query(query, params);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      logger.error('Failed to load businesses', { route: 'Founder', error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to load businesses' });
    }
  }

  async getBusiness(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const bizResult = await pool.query(`
        SELECT b.id, b.name, b.slug, b.business_type, b.phone, b.email,
          b.address, b.description, b.timezone, b.status, b.created_at, b.updated_at,
          sp.full_name AS owner_name, p.email AS owner_email, sp.user_id AS owner_user_id
        FROM businesses b
        LEFT JOIN staff_profiles sp ON sp.business_id = b.id AND sp.role = 'owner'
        LEFT JOIN profiles p ON p.id = sp.user_id
        WHERE b.id = $1
      `, [id]);

      if (bizResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }

      const [leads, appointments, escalations] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS count FROM customers WHERE business_id = $1`, [id]),
        pool.query(`SELECT COUNT(*)::int AS count FROM appointments WHERE business_id = $1 AND created_at > NOW() - INTERVAL '30 days'`, [id]),
        pool.query(`SELECT COUNT(*)::int AS count FROM escalations WHERE business_id = $1 AND created_at > NOW() - INTERVAL '30 days'`, [id]),
      ]);

      res.json({
        success: true,
        data: {
          ...bizResult.rows[0],
          recentActivity: {
            totalLeads: leads.rows[0].count,
            recentAppointments: appointments.rows[0].count,
            recentEscalations: escalations.rows[0].count,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to load business', { route: 'Founder', businessId: req.params?.id, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to load business' });
    }
  }

  async updateBusiness(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, email, phone, description } = req.body;

      const result = await pool.query(`
        UPDATE businesses
        SET name = COALESCE($1, name),
            email = COALESCE($2, email),
            phone = COALESCE($3, phone),
            description = COALESCE($4, description),
            updated_at = NOW()
        WHERE id = $5
        RETURNING id, name, slug, email, phone, description, status, updated_at
      `, [name || null, email || null, phone || null, description || null, id]);

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      logger.error('Failed to update business', { route: 'Founder', businessId: req.params?.id, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to update business' });
    }
  }

  async assignOwner(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { email, userId, name } = req.body;

      const bizResult = await pool.query('SELECT id, slug FROM businesses WHERE id = $1', [id]);
      if (bizResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }

      let ownerUserId = userId;

      let generatedPassword: string | undefined;

      if (!ownerUserId) {
        if (!email) {
          res.status(400).json({ success: false, error: 'Email is required to create a new owner' });
          return;
        }

        const password = generatePassword();
        generatedPassword = password;

        const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: name || email },
        });

        if (authError || !authUser.user) {
          logger.error('Supabase user creation failed', { route: 'Founder', error: authError instanceof Error ? authError.message : String(authError) });
          res.status(500).json({ success: false, error: 'Failed to create user' });
          return;
        }

        ownerUserId = authUser.user.id;
      }

      await pool.query(`DELETE FROM staff_profiles WHERE business_id = $1 AND role = 'owner'`, [id]);

      const insertResult = await pool.query(`
        INSERT INTO staff_profiles (user_id, business_id, role, status, full_name)
        VALUES ($1, $2, 'owner', 'active', $3)
        RETURNING id, user_id, created_at
      `, [ownerUserId, id, name || email || null]);

      res.json({
        success: true,
        data: {
          profileId: insertResult.rows[0].id,
          userId: ownerUserId,
          ...(generatedPassword ? { password: generatedPassword } : {}),
        },
      });
    } catch (error) {
      logger.error('Failed to assign owner', { route: 'Founder', businessId: req.params?.id, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to assign owner' });
    }
  }

  async updateBusinessStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['active', 'disabled'].includes(status)) {
        res.status(400).json({ success: false, error: 'Status must be "active" or "disabled"' });
        return;
      }

      const result = await pool.query(`
        UPDATE businesses SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, name, slug, status, updated_at
      `, [status, id]);

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      logger.error('Failed to update status', { route: 'Founder', businessId: req.params?.id, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to update status' });
    }
  }

  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const filter = req.query.role as string;
      let query = `
        SELECT p.id, p.email, p.full_name, p.global_role, p.created_at,
          sp.business_id, sp.role AS business_role, sp.status,
          b.name AS business_name, b.slug AS business_slug
        FROM profiles p
        LEFT JOIN staff_profiles sp ON sp.user_id = p.id
        LEFT JOIN businesses b ON b.id = sp.business_id
      `;
      const params: unknown[] = [];

      if (filter && ['owner', 'staff', 'SUPER_ADMIN'].includes(filter)) {
        if (filter === 'SUPER_ADMIN') {
          query += ` WHERE p.global_role = 'SUPER_ADMIN'`;
        } else {
          query += ` WHERE sp.role = $1`;
          params.push(filter);
        }
      }

      query += ` ORDER BY p.created_at DESC`;

      const result = await pool.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      logger.error('Failed to load users', { route: 'Founder', error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to load users' });
    }
  }

  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const userResult = await pool.query(`
        SELECT p.id, p.email, p.full_name, p.global_role, p.created_at, p.updated_at
        FROM profiles p
        WHERE p.id = $1
      `, [id]);

      if (userResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const membershipsResult = await pool.query(`
        SELECT sp.id AS profile_id, sp.business_id, sp.role, sp.status, sp.created_at,
          b.name AS business_name, b.slug AS business_slug
        FROM staff_profiles sp
        JOIN businesses b ON b.id = sp.business_id
        WHERE sp.user_id = $1
        ORDER BY sp.created_at DESC
      `, [id]);

      res.json({
        success: true,
        data: {
          ...userResult.rows[0],
          memberships: membershipsResult.rows,
        },
      });
    } catch (error) {
      logger.error('Failed to load user', { route: 'Founder', userId: req.params?.id, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to load user' });
    }
  }

  async updateUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['active', 'invited', 'suspended'].includes(status)) {
        res.status(400).json({ success: false, error: 'Status must be "active", "invited", or "suspended"' });
        return;
      }

      const result = await pool.query(`
        UPDATE staff_profiles SET status = $1, updated_at = NOW()
        WHERE user_id = $2
        RETURNING id, user_id, business_id, role, status
      `, [status, id]);

      res.json({
        success: true,
        data: { updated: result.rowCount ?? 0, profiles: result.rows },
      });
    } catch (error) {
      logger.error('Failed to update user status', { route: 'Founder', userId: req.params?.id, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to update user status' });
    }
  }

  async resetUserPassword(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const userResult = await pool.query('SELECT email FROM profiles WHERE id = $1', [id]);
      if (userResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const email = userResult.rows[0].email;
      const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { error: resetError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
      });

      if (resetError) {
        logger.error('Password reset error', { route: 'Founder', userId: req.params?.id, error: resetError instanceof Error ? resetError.message : String(resetError) });
        res.status(500).json({ success: false, error: 'Failed to generate reset link' });
        return;
      }

      logger.info('Password reset sent', { route: 'Founder', userId: id, email });
      res.json({ success: true, data: { message: 'Password reset link sent' } });
    } catch (error) {
      logger.error('Failed to reset password', { route: 'Founder', userId: req.params?.id, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
  }

  async transferOwnership(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { businessId, newOwnerId } = req.body;

      if (!businessId || !newOwnerId) {
        res.status(400).json({ success: false, error: 'businessId and newOwnerId are required' });
        return;
      }

      const bizResult = await pool.query('SELECT id FROM businesses WHERE id = $1', [businessId]);
      if (bizResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Remove current owner
        await client.query(
          `DELETE FROM staff_profiles WHERE business_id = $1 AND role = 'owner'`,
          [businessId]
        );

        // Demote current user to staff if they have a membership here
        // (or just leave them — they may not have been the owner)
        // Actually, the current owner (id param) might be a staff too. Let's not auto-demote.

        // Check if new owner already has a staff profile for this business
        const existing = await client.query(
          `SELECT id FROM staff_profiles WHERE user_id = $1 AND business_id = $2`,
          [newOwnerId, businessId]
        );

        if (existing.rows.length > 0) {
          // Update existing to owner
          await client.query(`
            UPDATE staff_profiles SET role = 'owner', status = 'active', updated_at = NOW()
            WHERE user_id = $1 AND business_id = $2
          `, [newOwnerId, businessId]);
        } else {
          // Create new owner profile
          const nameResult = await client.query(
            'SELECT full_name FROM profiles WHERE id = $1', [newOwnerId]
          );
          await client.query(`
            INSERT INTO staff_profiles (user_id, business_id, role, status, full_name)
            VALUES ($1, $2, 'owner', 'active', $3)
          `, [newOwnerId, businessId, nameResult.rows[0]?.full_name || null]);
        }

        await client.query('COMMIT');

        logger.info('Ownership transferred', { route: 'Founder', businessId, newOwnerId });
        res.json({ success: true, data: { businessId, newOwnerId } });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Failed to transfer ownership', { route: 'Founder', error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to transfer ownership' });
    }
  }

  async removeMembership(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { businessId } = req.body;

      if (!businessId) {
        res.status(400).json({ success: false, error: 'businessId is required' });
        return;
      }

      const result = await pool.query(
        `DELETE FROM staff_profiles WHERE user_id = $1 AND business_id = $2 AND role = 'staff'`,
        [id, businessId]
      );

      res.json({
        success: true,
        data: { removed: result.rowCount ?? 0 },
      });
    } catch (error) {
      logger.error('Failed to remove membership', { route: 'Founder', error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to remove membership' });
    }
  }

  async getPilotHealth(req: Request, res: Response): Promise<void> {
    try {
      const result = await pool.query(`
        SELECT
          b.id, b.name, b.slug, b.status, b.created_at,
          COALESCE(conv.conversations_today, 0) AS conversations_today,
          COALESCE(lead.leads_today, 0) AS leads_today,
          COALESCE(appt.appointments_today, 0) AS appointments_today,
          COALESCE(esc.escalations, 0) AS escalations,
          COALESCE(del.failed_deliveries, 0) AS failed_deliveries,
          COALESCE(del.total_deliveries, 0) AS total_deliveries,
          CASE
            WHEN COALESCE(del.total_deliveries, 0) = 0 THEN NULL
            ELSE ROUND(((COALESCE(del.total_deliveries, 0) - COALESCE(del.failed_deliveries, 0))::numeric / NULLIF(COALESCE(del.total_deliveries, 0), 0) * 100), 1)
          END AS delivery_rate
        FROM businesses b
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS conversations_today
          FROM conversations WHERE business_id = b.id AND created_at::date = CURRENT_DATE
        ) conv ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS leads_today
          FROM customers WHERE business_id = b.id AND created_at::date = CURRENT_DATE
        ) lead ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS appointments_today
          FROM appointments WHERE business_id = b.id AND created_at::date = CURRENT_DATE
        ) appt ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS escalations
          FROM escalations WHERE business_id = b.id AND status = 'pending'
        ) esc ON true
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::int AS total_deliveries,
            COUNT(*) FILTER (WHERE delivery_status = 'failed')::int AS failed_deliveries
          FROM message_deliveries
          WHERE business_id = b.id AND created_at > NOW() - INTERVAL '7 days'
        ) del ON true
        ORDER BY b.created_at DESC
      `);

      const rows = result.rows.map((row: any) => {
        let riskLevel: string;
        const totalDeliveries = row.total_deliveries;
        const failedDeliveries = row.failed_deliveries;
        const deliveryRate = row.delivery_rate;
        const escalations = row.escalations;

        if (totalDeliveries === 0) {
          riskLevel = 'unknown';
        } else if (failedDeliveries > 0 && deliveryRate !== null && deliveryRate < 80) {
          riskLevel = 'critical';
        } else if (escalations > 5) {
          riskLevel = 'warning';
        } else if (failedDeliveries > 0) {
          riskLevel = 'warning';
        } else {
          riskLevel = 'healthy';
        }

        return { ...row, risk_level: riskLevel };
      });

      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('Failed to load pilot health', { route: 'Founder', error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to load pilot health' });
    }
  }

  async supportSearch(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        q: z.string().min(2, 'Search query must be at least 2 characters'),
      });
      const { q } = schema.parse(req.query);
      const pattern = `%${q}%`;

      const [businesses, leads, conversations, appointments] = await Promise.all([
        pool.query(`
          SELECT id, name, slug, 'business' AS entity_type
          FROM businesses
          WHERE name ILIKE $1 OR slug ILIKE $1
          LIMIT 20
        `, [pattern]),
        pool.query(`
          SELECT c.id AS customer_id, c.name AS customer_name, c.phone, c.email,
            c.business_id, b.name AS business_name, b.slug AS business_slug,
            c.lifecycle_state, 'lead' AS entity_type
          FROM customers c
          JOIN businesses b ON b.id = c.business_id
          WHERE c.name ILIKE $1 OR c.phone ILIKE $1 OR c.email ILIKE $1
          LIMIT 20
        `, [pattern]),
        pool.query(`
          SELECT conv.id AS conversation_id, conv.channel_type, cust.name AS customer_name,
            conv.business_id, b.name AS business_name, b.slug AS business_slug,
            'conversation' AS entity_type
          FROM conversations conv
          JOIN businesses b ON b.id = conv.business_id
          LEFT JOIN customers cust ON cust.id = conv.customer_id
          WHERE conv.id::text ILIKE $1
          LIMIT 20
        `, [pattern]),
        pool.query(`
          SELECT a.id AS appointment_id, a.appointment_time, a.status AS appointment_status,
            cust.name AS customer_name, a.business_id, b.name AS business_name,
            b.slug AS business_slug, 'appointment' AS entity_type
          FROM appointments a
          JOIN businesses b ON b.id = a.business_id
          LEFT JOIN customers cust ON cust.id = a.customer_id
          WHERE a.id::text ILIKE $1
          LIMIT 20
        `, [pattern]),
      ]);

      res.json({
        success: true,
        data: {
          businesses: businesses.rows,
          leads: leads.rows,
          conversations: conversations.rows,
          appointments: appointments.rows,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to search support data', { route: 'Founder', error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to search support data' });
    }
  }

  async getBusinessHealth(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const bizResult = await pool.query(`
        SELECT b.id, b.name, b.slug, b.status, b.business_type, b.phone, b.email, b.timezone,
          b.created_at, sp.full_name AS owner_name, p.email AS owner_email
        FROM businesses b
        LEFT JOIN staff_profiles sp ON sp.business_id = b.id AND sp.role = 'owner'
        LEFT JOIN profiles p ON p.id = sp.user_id
        WHERE b.id = $1
      `, [id]);

      if (bizResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }

      const [todayMetrics, deliveryHealth, recentActivity] = await Promise.all([
        pool.query(`
          SELECT
            (SELECT COUNT(*)::int FROM conversations WHERE business_id = $1 AND created_at::date = CURRENT_DATE) AS conversations_today,
            (SELECT COUNT(*)::int FROM customers WHERE business_id = $1 AND created_at::date = CURRENT_DATE) AS leads_today,
            (SELECT COUNT(*)::int FROM appointments WHERE business_id = $1 AND created_at::date = CURRENT_DATE) AS appointments_today,
            (SELECT COUNT(*)::int FROM escalations WHERE business_id = $1 AND status = 'pending') AS pending_escalations,
            (SELECT COUNT(*)::int FROM escalations WHERE business_id = $1) AS total_escalations
        `, [id]),
        pool.query(`
          SELECT
            COUNT(*)::int AS total_deliveries,
            COUNT(*) FILTER (WHERE delivery_status = 'failed')::int AS failed_deliveries,
            CASE
              WHEN COUNT(*) = 0 THEN 0
              ELSE ROUND((COUNT(*) FILTER (WHERE delivery_status IN ('delivered', 'read'))::numeric / COUNT(*) * 100), 1)
            END AS delivery_rate
          FROM message_deliveries
          WHERE business_id = $1 AND created_at > NOW() - INTERVAL '7 days'
        `, [id]),
        pool.query(`
          SELECT event_type, occurred_at, description
          FROM (
            SELECT 'lead_created' AS event_type, created_at AS occurred_at,
              'Lead: ' || COALESCE(name, 'Unknown') AS description
            FROM customers WHERE business_id = $1 AND created_at > NOW() - INTERVAL '7 days'
            UNION ALL
            SELECT 'appointment', created_at,
              'Appointment: ' || status
            FROM appointments WHERE business_id = $1 AND created_at > NOW() - INTERVAL '7 days'
            UNION ALL
            SELECT 'escalation', created_at,
              'Escalation: ' || LEFT(reason, 80)
            FROM escalations WHERE business_id = $1 AND created_at > NOW() - INTERVAL '7 days'
          ) AS activity
          ORDER BY occurred_at DESC
          LIMIT 20
        `, [id]),
      ]);

      res.json({
        success: true,
        data: {
          business: bizResult.rows[0],
          todayMetrics: todayMetrics.rows[0],
          deliveryHealth: deliveryHealth.rows[0],
          recentActivity: recentActivity.rows,
        },
      });
    } catch (error) {
      logger.error('Failed to load business health', { route: 'Founder', businessId: req.params?.id, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to load business health' });
    }
  }

  async getOnboarding(req: Request, res: Response): Promise<void> {
    try {
      const result = await pool.query(`
        SELECT b.id, b.name, b.slug, b.created_at,
          b.appointment_settings->'onboarding'->>'industry' AS industry,
          b.appointment_settings->'onboarding'->>'method' AS method
        FROM businesses b
        WHERE b.appointment_settings->'onboarding' IS NOT NULL
        ORDER BY b.created_at DESC
        LIMIT 20
      `);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      logger.error('Failed to load onboarding data', { route: 'Founder', error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to load onboarding data' });
    }
  }
}

export const founderController = new FounderController();
