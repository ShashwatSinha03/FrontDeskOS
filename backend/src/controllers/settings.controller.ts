import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/db';
import { businessRepository, availabilityRepository } from '../repositories';
import { channelService, getAllChannelCapabilities } from '../services/channel';
import { logger } from '../lib/logger';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export class SettingsController {
  async getBusiness(req: Request, res: Response): Promise<void> {
    try {
      const business = await businessRepository.findById(req.membership!.businessId);
      if (!business) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }
      res.json({
        success: true,
        data: {
          name: business.name,
          email: business.email || '',
          phone: business.phone || '',
          address: business.address || '',
          description: business.description || '',
        },
      });
    } catch (error) {
      logger.error('Failed to load business settings', { route: 'Settings', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to load business settings' });
    }
  }

  async updateBusiness(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        name: z.string().min(1).max(255).optional(),
        email: z.string().email().optional().or(z.literal('')),
        phone: z.string().max(50).optional().or(z.literal('')),
        address: z.string().optional().or(z.literal('')),
        description: z.string().optional().or(z.literal('')),
      });
      const fields = schema.parse(req.body);

      const sets: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          const col = key === 'name' ? 'name' : key;
          sets.push(`${col} = $${idx++}`);
          params.push(value === '' ? null : value);
        }
      }

      if (sets.length === 0) {
        res.status(400).json({ success: false, error: 'No fields to update' });
        return;
      }

      params.push(req.membership!.businessId);
      const query = `UPDATE businesses SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING name, email, phone, address, description`;

      const result = await pool.query(query, params);
      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to update business settings', { route: 'Settings', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to update business' });
    }
  }

  async getServices(req: Request, res: Response): Promise<void> {
    try {
      const query = `
        SELECT id, name, description, price_min, price_max, duration_minutes, is_active, created_at
        FROM services
        WHERE business_id = $1
        ORDER BY created_at ASC
      `;
      const result = await pool.query(query, [req.membership!.businessId]);
      res.json({
        success: true,
        data: result.rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description || '',
          price: parseFloat(r.price_min),
          durationMinutes: r.duration_minutes,
          isActive: r.is_active,
          createdAt: r.created_at,
        })),
      });
    } catch (error) {
      logger.error('Failed to load services', { route: 'Settings', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to load services' });
    }
  }

  async createService(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        description: z.string().optional().or(z.literal('')),
        durationMinutes: z.number().int().positive('Duration must be > 0'),
        price: z.number().min(0, 'Price must be >= 0'),
      });
      const { name, description, durationMinutes, price } = schema.parse(req.body);

      const result = await pool.query(`
        INSERT INTO services (business_id, name, description, price_min, price_max, duration_minutes)
        VALUES ($1, $2, $3, $4, $4, $5)
        RETURNING id, name, description, price_min, price_max, duration_minutes, is_active
      `, [req.membership!.businessId, name, description || null, price, durationMinutes]);

      const r = result.rows[0];
      res.status(201).json({
        success: true,
        data: {
          id: r.id,
          name: r.name,
          description: r.description || '',
          price: parseFloat(r.price_min),
          durationMinutes: r.duration_minutes,
          isActive: r.is_active,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to create service', { route: 'Settings', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to create service' });
    }
  }

  async updateService(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const schema = z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional().or(z.literal('')),
        durationMinutes: z.number().int().positive().optional(),
        price: z.number().min(0).optional(),
      });
      const fields = schema.parse(req.body);

      const sets: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (fields.name !== undefined) { sets.push(`name = $${idx++}`); params.push(fields.name); }
      if (fields.description !== undefined) { sets.push(`description = $${idx++}`); params.push(fields.description || null); }
      if (fields.durationMinutes !== undefined) { sets.push(`duration_minutes = $${idx++}`); params.push(fields.durationMinutes); }
      if (fields.price !== undefined) { sets.push(`price_min = $${idx++}`, `price_max = $${idx++}`); params.push(fields.price, fields.price); }

      if (sets.length === 0) {
        res.status(400).json({ success: false, error: 'No fields to update' });
        return;
      }

      params.push(id, req.membership!.businessId);
      const query = `UPDATE services SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx++} AND business_id = $${idx} RETURNING id, name, description, price_min, duration_minutes, is_active`;

      const result = await pool.query(query, params);
      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Service not found' });
        return;
      }

      const r = result.rows[0];
      res.json({
        success: true,
        data: {
          id: r.id,
          name: r.name,
          description: r.description || '',
          price: parseFloat(r.price_min),
          durationMinutes: r.duration_minutes,
          isActive: r.is_active,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to update service', { route: 'Settings', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to update service' });
    }
  }

  async toggleService(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const schema = z.object({ isActive: z.boolean() });
      const { isActive } = schema.parse(req.body);

      const result = await pool.query(`
        UPDATE services SET is_active = $1, updated_at = NOW()
        WHERE id = $2 AND business_id = $3
        RETURNING id, name, is_active
      `, [isActive, id, req.membership!.businessId]);

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Service not found' });
        return;
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to toggle service', { route: 'Settings', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to toggle service' });
    }
  }

  async getHours(req: Request, res: Response): Promise<void> {
    try {
      const schedules = await availabilityRepository.findSchedules(req.membership!.businessId);

      const week: Record<string, { open: boolean; start: string; end: string }> = {};
      for (const day of DAY_NAMES) {
        week[day] = { open: false, start: '09:00', end: '17:00' };
      }

      for (const s of schedules) {
        const dayName = DAY_NAMES[s.dayOfWeek];
        if (dayName) {
          week[dayName] = { open: true, start: s.startTime.slice(0, 5), end: s.endTime.slice(0, 5) };
        }
      }

      res.json({ success: true, data: week });
    } catch (error) {
      logger.error('Failed to load hours', { route: 'Settings', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to load hours' });
    }
  }

  async updateHours(req: Request, res: Response): Promise<void> {
    try {
      const daySchema = z.object({ open: z.boolean(), start: z.string(), end: z.string() });
      const schema = z.record(z.string(), daySchema);
      const week = schema.parse(req.body);

      const businessId = req.membership!.businessId;
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        await client.query(
          `DELETE FROM availability_schedules WHERE business_id = $1 AND service_id IS NULL`,
          [businessId]
        );

        for (let d = 0; d < 7; d++) {
          const dayName = DAY_NAMES[d];
          const day = week[dayName];
          if (day?.open && day.start && day.end) {
            await client.query(`
              INSERT INTO availability_schedules (business_id, day_of_week, start_time, end_time)
              VALUES ($1, $2, $3, $4)
            `, [businessId, d, day.start, day.end]);
          }
        }

        await client.query('COMMIT');
        res.json({ success: true, data: week });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to update hours', { route: 'Settings', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to update hours' });
    }
  }

  async getFaqs(req: Request, res: Response): Promise<void> {
    try {
      const business = await businessRepository.findById(req.membership!.businessId);
      if (!business) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }
      res.json({ success: true, data: business.faqs });
    } catch (error) {
      logger.error('Failed to load FAQs', { route: 'Settings', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to load FAQs' });
    }
  }

  async updateFaqs(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        faqs: z.array(z.object({
          question: z.string().min(1),
          answer: z.string().min(1),
        })),
      });
      const { faqs } = schema.parse(req.body);

      await businessRepository.updateFaqs(req.membership!.businessId, faqs);
      res.json({ success: true, data: faqs });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to update FAQs', { route: 'Settings', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to update FAQs' });
    }
  }

  async getAi(req: Request, res: Response): Promise<void> {
    try {
      const business = await businessRepository.findById(req.membership!.businessId);
      if (!business) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }

      const settings = business.appointmentSettings || {};
      const ai = (settings as any).ai || {};

      res.json({
        success: true,
        data: {
          greeting: ai.greeting || '',
          leadCaptureEnabled: ai.leadCaptureEnabled ?? true,
          bookingEnabled: ai.bookingEnabled ?? true,
          escalationEmail: ai.escalationEmail || business.email || '',
        },
      });
    } catch (error) {
      logger.error('Failed to load AI settings', { route: 'Settings', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to load AI settings' });
    }
  }

  async updateAi(req: Request, res: Response): Promise<void> {
    try {
      const business = await businessRepository.findById(req.membership!.businessId);
      if (!business) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }

      const schema = z.object({
        greeting: z.string().optional(),
        leadCaptureEnabled: z.boolean().optional(),
        bookingEnabled: z.boolean().optional(),
        escalationEmail: z.string().optional().or(z.literal('')),
      });
      const input = schema.parse(req.body);

      const settings = { ...business.appointmentSettings } as any;
      const ai = { ...((settings.ai as any) || {}) };

      if (input.greeting !== undefined) ai.greeting = input.greeting;
      if (input.leadCaptureEnabled !== undefined) ai.leadCaptureEnabled = input.leadCaptureEnabled;
      if (input.bookingEnabled !== undefined) ai.bookingEnabled = input.bookingEnabled;
      if (input.escalationEmail !== undefined) ai.escalationEmail = input.escalationEmail;

      settings.ai = ai;

      await businessRepository.updateAppointmentSettings(req.membership!.businessId, settings);

      res.json({
        success: true,
        data: {
          greeting: ai.greeting || '',
          leadCaptureEnabled: ai.leadCaptureEnabled ?? true,
          bookingEnabled: ai.bookingEnabled ?? true,
          escalationEmail: ai.escalationEmail || '',
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to update AI settings', { route: 'Settings', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to update AI settings' });
    }
  }

  async getChannels(req: Request, res: Response): Promise<void> {
    try {
      const channels = await channelService.getChannels(req.membership!.businessId);
      const capabilities = getAllChannelCapabilities();
      res.json({ success: true, data: { channels, capabilities } });
    } catch (error) {
      logger.error('Failed to load channels', { route: 'Settings', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to load channels' });
    }
  }

  async updateChannel(req: Request, res: Response): Promise<void> {
    try {
      const { channelType } = req.params;
      const schema = z.object({
        enabled: z.boolean().optional(),
        provider: z.string().optional(),
        configJson: z.record(z.unknown()).optional(),
      });
      const config = schema.parse(req.body);

      const updated = await channelService.updateChannel(req.membership!.businessId, channelType, config);
      res.json({ success: true, data: updated });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to update channel', { route: 'Settings', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: error.message || 'Failed to update channel' });
    }
  }
}

export const settingsController = new SettingsController();
