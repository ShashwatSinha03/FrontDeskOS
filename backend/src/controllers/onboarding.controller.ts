import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import config from '../config';
import pool from '../config/db';
import { onboardingService } from '../services/onboarding/onboarding.service';

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(randomBytes(length), (b) => chars[b % chars.length]).join('');
}

export class OnboardingController {
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { industry } = req.params;

      if (industry === 'list') {
        res.status(200).json({
          success: true,
          data: onboardingService.listIndustries(),
        });
        return;
      }

      const template = onboardingService.getTemplate(industry);
      if (!template) {
        res.status(404).json({
          success: false,
          error: `Industry template "${industry}" not found`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: template,
      });
    } catch (error: any) {
      console.error('[Onboarding] Error fetching template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load industry template',
      });
    }
  }

  async publish(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        sessionId: z.string().uuid('Valid onboarding session ID is required'),
        business: z.object({
          name: z.string().min(2),
          slug: z.string().min(3).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
          tagline: z.string().optional(),
          description: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email(),
          address: z.string().optional(),
          timezone: z.string().optional(),
        }),
        services: z.array(z.object({
          name: z.string().min(2),
          description: z.string().optional(),
          durationMinutes: z.number().int().min(5),
          price: z.number().min(0),
          category: z.string().optional(),
        })).min(1, 'At least one service is required'),
        hours: z.array(z.object({
          dayOfWeek: z.number().int().min(0).max(6),
          openTime: z.string(),
          closeTime: z.string(),
          isClosed: z.boolean(),
        })).length(7, 'All 7 days must be specified'),
        faqs: z.array(z.object({
          question: z.string().min(2),
          answer: z.string(),
          category: z.string().optional(),
        })),
        ai: z.object({
          greeting: z.string().min(5),
          escalationEmail: z.string().email(),
          slotDurationMinutes: z.number().int().min(15).max(120).default(30),
          autoEscalateKeywords: z.array(z.string()).optional(),
        }),
        industryTemplate: z.string(),
        templateVersion: z.string(),
      });

      const parsed = schema.parse(req.body);

      console.log(`[Onboarding] publish_attempted session=${parsed.sessionId} industry=${parsed.industryTemplate} business=${parsed.business.name}`);

      const errors = onboardingService.validatePublishRequest(parsed);
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          errors: errors.map(e => ({ path: [e.field], message: e.message })),
        });
        return;
      }

      const result = await onboardingService.publish(parsed);

      const action = result.idempotent ? 'idempotent_replay' : 'created';
      console.log(`[Onboarding] publish_succeeded session=${parsed.sessionId} businessId=${result.businessId} action=${action}`);

      res.status(result.idempotent ? 200 : 201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          errors: error.errors,
        });
        return;
      }

      if (error.message?.includes('already taken')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }

      console.error('[Onboarding] Publish error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to publish tenant. Please try again.',
      });
    }
  }

  async createOwner(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        businessId: z.string().uuid('Valid business ID is required'),
        name: z.string().min(2, 'Owner name is required'),
        email: z.string().email('Valid email is required'),
      });

      const parsed = schema.parse(req.body);

      console.log(`[Onboarding] owner_invited businessId=${parsed.businessId} email=${parsed.email}`);

      // Verify business exists
      const bizQuery = `SELECT id, slug FROM businesses WHERE id = $1`;
      const bizRes = await pool.query(bizQuery, [parsed.businessId]);
      if (bizRes.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Business not found',
        });
        return;
      }
      const slug = bizRes.rows[0].slug;

      // Generate a secure random password so the founder can share it with the owner
      const password = generatePassword();

      const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: parsed.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: parsed.name,
          business_id: parsed.businessId,
          role: 'owner',
        },
      });

      if (authError || !authUser.user) {
        console.error(`[Onboarding] Supabase auth user creation failed:`, authError);
        res.status(201).json({
          success: true,
          data: {
            ownerId: null,
            email: parsed.email,
            name: parsed.name,
            dashboardUrl: `https://frontdeskos.vercel.app/${slug}/admin`,
            message: 'Tenant is active. Owner account creation encountered an issue. The owner can sign up manually.',
          },
        });
        return;
      }

      const insertQuery = `
        INSERT INTO staff_profiles (user_id, business_id, role, full_name)
        VALUES ($1, $2, 'owner', $3)
        RETURNING id, created_at
      `;
      const insertRes = await pool.query(insertQuery, [authUser.user.id, parsed.businessId, parsed.name]);

      console.log(`[Onboarding] owner_created businessId=${parsed.businessId} profileId=${insertRes.rows[0].id} authUserId=${authUser.user.id}`);

      res.status(201).json({
        success: true,
        data: {
          ownerId: insertRes.rows[0].id,
          email: parsed.email,
          name: parsed.name,
          password,
          dashboardUrl: `https://frontdeskos.vercel.app/${slug}/admin`,
          message: 'Owner account created. Share the password below with the owner.',
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          errors: error.errors,
        });
        return;
      }

      console.error('[Onboarding] Owner creation error:', error);
      // Tenant stays active — never rollback tenant creation
      res.status(500).json({
        success: false,
        error: 'Failed to create owner account. Tenant remains active.',
      });
    }
  }
}

export const onboardingController = new OnboardingController();
export default onboardingController;
