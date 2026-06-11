import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/db';
import { subscriptionService } from '../services/subscription.service';

const updateBusinessSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
});

const createServiceSchema = z.object({
  name: z.string().min(1, 'Service name required'),
  description: z.string().optional(),
  price: z.number().positive(),
  duration: z.number().int().positive('Duration must be > 0'),
});

const updateServiceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  duration: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
});

const updateFaqsSchema = z.object({
  faqs: z.array(z.object({
    question: z.string().min(1, 'Question required'),
    answer: z.string().min(1, 'Answer required'),
  })),
});

class SettingsController {
  private requireEditAccess(req: Request, res: Response): boolean {
    if (!req.membership || !['owner', 'manager'].includes(req.membership.role)) {
      res.status(403).json({ success: false, error: 'Forbidden. Edit access requires owner or manager role.' });
      return false;
    }
    return true;
  }

  async getBusiness(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.business_id;
      const { rows } = await pool.query(
        'SELECT name, email, phone, address, description FROM businesses WHERE id = $1',
        [businessId]
      );
      if (!rows.length) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }
      res.json({ success: true, data: rows[0] });
    } catch (error: any) {
      console.error('❌ getBusiness error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateBusiness(req: Request, res: Response): Promise<void> {
    try {
      if (!this.requireEditAccess(req, res)) return;
      const businessId = req.membership!.business_id;
      const body = updateBusinessSchema.parse(req.body);

      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined) {
          fields.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }

      if (fields.length === 0) {
        res.status(400).json({ success: false, error: 'No fields to update' });
        return;
      }

      fields.push(`updated_at = NOW()`);
      values.push(businessId);

      await pool.query(
        `UPDATE businesses SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
        values
      );

      const { rows } = await pool.query(
        'SELECT name, email, phone, address, description FROM businesses WHERE id = $1',
        [businessId]
      );

      res.json({ success: true, data: rows[0] });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('❌ updateBusiness error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async listServices(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.business_id;
      const { rows } = await pool.query(
        'SELECT * FROM services WHERE business_id = $1 ORDER BY created_at DESC',
        [businessId]
      );
      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error('❌ listServices error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createService(req: Request, res: Response): Promise<void> {
    try {
      if (!this.requireEditAccess(req, res)) return;
      const businessId = req.membership!.business_id;
      const body = createServiceSchema.parse(req.body);

      const { rows } = await pool.query(
        `INSERT INTO services (business_id, name, description, price_min, price_max, duration, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         RETURNING *`,
        [businessId, body.name, body.description ?? null, body.price, body.price, body.duration]
      );

      res.status(201).json({ success: true, data: rows[0] });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('❌ createService error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateService(req: Request, res: Response): Promise<void> {
    try {
      if (!this.requireEditAccess(req, res)) return;
      const businessId = req.membership!.business_id;
      const serviceId = req.params.id;
      const body = updateServiceSchema.parse(req.body);

      // If deactivating, ensure at least one other active service remains
      if (body.is_active === false) {
        const { rows } = await pool.query(
          'SELECT COUNT(*)::int as count FROM services WHERE business_id = $1 AND is_active = TRUE AND id != $2',
          [businessId, serviceId]
        );
        if (rows[0].count === 0) {
          res.status(400).json({ success: false, error: 'Cannot deactivate the only active service. At least one active service is required.' });
          return;
        }
      }

      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined) {
          fields.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }

      if (fields.length === 0) {
        res.status(400).json({ success: false, error: 'No fields to update' });
        return;
      }

      fields.push(`updated_at = NOW()`);
      values.push(serviceId);
      values.push(businessId);

      const { rows } = await pool.query(
        `UPDATE services SET ${fields.join(', ')} WHERE id = $${paramIndex++} AND business_id = $${paramIndex} RETURNING *`,
        values
      );

      if (!rows.length) {
        res.status(404).json({ success: false, error: 'Service not found' });
        return;
      }

      res.json({ success: true, data: rows[0] });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('❌ updateService error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteService(req: Request, res: Response): Promise<void> {
    try {
      if (!this.requireEditAccess(req, res)) return;
      const businessId = req.membership!.business_id;
      const serviceId = req.params.id;

      // Ensure at least one other active service remains
      const { rows: countRows } = await pool.query(
        'SELECT COUNT(*)::int as count FROM services WHERE business_id = $1 AND is_active = TRUE AND id != $2',
        [businessId, serviceId]
      );
      if (countRows[0].count === 0) {
        res.status(400).json({ success: false, error: 'Cannot delete the only active service. At least one active service is required.' });
        return;
      }

      const { rows } = await pool.query(
        'UPDATE services SET is_active = FALSE, updated_at = NOW() WHERE id = $1 AND business_id = $2 RETURNING *',
        [serviceId, businessId]
      );

      if (!rows.length) {
        res.status(404).json({ success: false, error: 'Service not found' });
        return;
      }

      res.json({ success: true, data: rows[0] });
    } catch (error: any) {
      console.error('❌ deleteService error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getHours(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.business_id;
      const schedules = await pool.query(
        'SELECT * FROM availability_schedules WHERE business_id = $1 ORDER BY day_of_week, start_time',
        [businessId]
      );
      const overrides = await pool.query(
        'SELECT * FROM availability_overrides WHERE business_id = $1 AND date >= CURRENT_DATE ORDER BY date',
        [businessId]
      );
      res.json({ success: true, data: { schedules: schedules.rows, overrides: overrides.rows } });
    } catch (error: any) {
      console.error('❌ getHours error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateHours(req: Request, res: Response): Promise<void> {
    try {
      if (!this.requireEditAccess(req, res)) return;
      const businessId = req.membership!.business_id;
      const { schedules } = z.object({
        schedules: z.array(z.object({
          id: z.string().uuid().optional(),
          day_of_week: z.number().int().min(0).max(6),
          start_time: z.string(),
          end_time: z.string(),
        })).min(1, 'At least one open day required'),
      }).parse(req.body);

      for (const s of schedules) {
        if (s.id) {
          await pool.query(
            `UPDATE availability_schedules SET day_of_week = $1, start_time = $2, end_time = $3, updated_at = NOW() WHERE id = $4 AND business_id = $5`,
            [s.day_of_week, s.start_time, s.end_time, s.id, businessId]
          );
        } else {
          await pool.query(
            `INSERT INTO availability_schedules (business_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)`,
            [businessId, s.day_of_week, s.start_time, s.end_time]
          );
        }
      }

      // Remove schedules for days not in the input
      const dayNumbers = schedules.map(s => s.day_of_week);
      await pool.query(
        `DELETE FROM availability_schedules WHERE business_id = $1 AND day_of_week != ALL($2::int[])`,
        [businessId, dayNumbers]
      );

      res.json({ success: true });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('❌ updateHours error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getFaqs(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.business_id;
      const { rows } = await pool.query(
        'SELECT COALESCE(faqs, \'[]\'::jsonb) as faqs FROM businesses WHERE id = $1',
        [businessId]
      );
      if (!rows.length) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }
      res.json({ success: true, data: rows[0].faqs });
    } catch (error: any) {
      console.error('❌ getFaqs error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateFaqs(req: Request, res: Response): Promise<void> {
    try {
      if (!this.requireEditAccess(req, res)) return;
      const businessId = req.membership!.business_id;
      const { faqs } = updateFaqsSchema.parse(req.body);

      const { rows } = await pool.query(
        'UPDATE businesses SET faqs = $1::jsonb, updated_at = NOW() WHERE id = $2 RETURNING faqs',
        [JSON.stringify(faqs), businessId]
      );

      if (!rows.length) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }

      res.json({ success: true, data: rows[0].faqs });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('❌ updateFaqs error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAiSettings(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.business_id;
      const { rows } = await pool.query(
        `SELECT appointment_settings->>'greeting' as greeting,
                appointment_settings->>'bookingEnabled' as booking_enabled,
                appointment_settings->>'leadCaptureEnabled' as lead_capture_enabled,
                appointment_settings->'escalationRules' as escalation_rules,
                appointment_settings->>'version' as version
         FROM businesses WHERE id = $1`,
        [businessId]
      );
      if (!rows.length) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }
      const data = rows[0];
      res.json({
        success: true,
        data: {
          greeting: data.greeting || 'Hello! How can I help you today?',
          bookingEnabled: data.booking_enabled !== 'false',
          leadCaptureEnabled: data.lead_capture_enabled !== 'false',
          escalationRules: data.escalation_rules || null,
          version: data.version || '1.0',
        }
      });
    } catch (error: any) {
      console.error('❌ getAiSettings error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateAiSettings(req: Request, res: Response): Promise<void> {
    try {
      if (!this.requireEditAccess(req, res)) return;
      const businessId = req.membership!.business_id;
      const body = z.object({
        greeting: z.string().min(1, 'Greeting required'),
        bookingEnabled: z.boolean(),
        leadCaptureEnabled: z.boolean(),
        escalationRules: z.object({
          autoEscalateKeywords: z.array(z.string()).optional(),
          alertMethods: z.array(z.enum(['dashboard', 'email', 'sms'])).optional(),
          notifyEmail: z.string().email().optional(),
          notifyPhone: z.string().optional(),
          inactivityTimeoutMinutes: z.number().int().positive().optional(),
        }).optional(),
        version: z.string().default('1.0'),
      }).parse(req.body);

      const settings = {
        version: body.version,
        greeting: body.greeting,
        bookingEnabled: body.bookingEnabled,
        leadCaptureEnabled: body.leadCaptureEnabled,
      };

      await pool.query(
        `UPDATE businesses SET appointment_settings = appointment_settings || $2::jsonb, updated_at = NOW() WHERE id = $1`,
        [businessId, JSON.stringify(settings)]
      );

      if (body.escalationRules) {
        await pool.query(
          `UPDATE businesses SET escalation_rules = $2::jsonb, updated_at = NOW() WHERE id = $1`,
          [businessId, JSON.stringify(body.escalationRules)]
        );
      }

      res.json({ success: true });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('❌ updateAiSettings error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async previewChat(req: Request, res: Response): Promise<void> {
    try {
      const { greeting, faqs, question } = z.object({
        greeting: z.string(),
        faqs: z.array(z.object({ question: z.string(), answer: z.string() })),
        question: z.string().default('What are your hours?'),
      }).parse(req.body);

      const faq = faqs.find(f => f.question.toLowerCase().includes(question.toLowerCase().replace('?', '')));
      const response = faq ? faq.answer : "I'm not sure about that. Let me connect you with someone who can help.";

      const conversation = [
        { role: 'system', content: greeting },
        { role: 'customer', content: question },
        { role: 'assistant', content: response },
        { role: 'system', content: 'The AI receptionist responded using the configured FAQ. If the FAQ had no match, it offered to connect to a human.' },
      ];

      res.json({ success: true, data: { conversation } });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('❌ previewChat error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
  async getBilling(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.business_id;

      const subRes = await pool.query(
        `SELECT id, plan_name, plan_type, status, amount, currency, billing_cycle,
                current_period_start, current_period_end, trial_end, created_at
         FROM subscriptions
         WHERE business_id = $1
         ORDER BY created_at DESC LIMIT 1`,
        [businessId]
      );

      if (subRes.rows.length === 0) {
        res.json({
          success: true,
          data: {
            subscription: null,
            events: [],
            supportContact: 'founder@frontdeskos.app',
          },
        });
        return;
      }

      const sub = subRes.rows[0];
      const events = await subscriptionService.getBillingHistory(sub.id);

      res.json({
        success: true,
        data: {
          subscription: {
            id: sub.id,
            planName: sub.plan_name,
            planType: sub.plan_type,
            status: sub.status,
            amount: parseFloat(sub.amount),
            currency: sub.currency,
            billingCycle: sub.billing_cycle,
            currentPeriodStart: sub.current_period_start,
            currentPeriodEnd: sub.current_period_end,
            trialEnd: sub.trial_end,
            createdAt: sub.created_at,
          },
          events,
          supportContact: 'founder@frontdeskos.app',
        },
      });
    } catch (error: any) {
      console.error('❌ getBilling error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const settingsController = new SettingsController();
export default settingsController;
