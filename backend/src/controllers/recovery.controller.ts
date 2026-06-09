import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/db';

export class RecoveryController {
  async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({ businessId: z.string().uuid() });
      const { businessId } = schema.parse(req.query);
      const query = `SELECT appointment_settings->'recoveryConfig' as recovery_config FROM businesses WHERE id = $1`;
      const result = await pool.query(query, [businessId]);
      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }
      res.status(200).json({ success: true, data: result.rows[0].recovery_config });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        businessId: z.string().uuid(),
        recoveryConfig: z.object({
          inactivityTimeoutMinutes: z.number().min(1).max(1440),
          sequences: z.record(z.array(z.object({
            type: z.enum(['re_engagement', 'day_1', 'day_3', 'missed_call']),
            delayMinutes: z.number().optional(),
            delayHours: z.number().optional(),
            channel: z.enum(['web_chat', 'whatsapp', 'voice', 'sms']),
          }))),
        }),
      });
      const parsed = schema.parse(req.body);
      const query = `
        UPDATE businesses
        SET appointment_settings = jsonb_set(
          COALESCE(appointment_settings, '{}'::jsonb),
          '{recoveryConfig}',
          $2::jsonb
        )
        WHERE id = $1
        RETURNING appointment_settings->'recoveryConfig' as recovery_config
      `;
      const result = await pool.query(query, [parsed.businessId, JSON.stringify(parsed.recoveryConfig)]);
      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }
      res.status(200).json({ success: true, data: result.rows[0].recovery_config });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const recoveryController = new RecoveryController();
