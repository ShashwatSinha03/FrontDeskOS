import { Request, Response } from 'express';
import { z } from 'zod';
import founderRepository from '../repositories/founder.repository';
import { subscriptionService } from '../services/subscription.service';

const uuidSchema = z.string().uuid('Invalid UUID');

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export class FounderController {
  async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const overview = await founderRepository.getOverview();
      res.json({ success: true, data: overview });
    } catch (error) {
      console.error('[Founder] getOverview error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch overview' });
    }
  }

  async listBusinesses(req: Request, res: Response): Promise<void> {
    try {
      const query = paginationSchema.parse(req.query);
      const search = req.query.search as string | undefined;
      const plan = req.query.plan as string | undefined;

      const result = await founderRepository.listBusinessesPaginated({
        page: query.page,
        limit: query.limit,
        search,
        plan,
      });

      res.json({ success: true, data: result.rows, total: result.total, page: query.page, limit: query.limit });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('[Founder] listBusinesses error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch businesses' });
    }
  }

  async getBusiness(req: Request, res: Response): Promise<void> {
    try {
      const id = uuidSchema.parse(req.params.id);
      const business = await founderRepository.getBusinessDetail(id);

      if (!business) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }

      // Fetch recent leads, appointments, escalations for this business
      const [recentLeads, recentAppointments, recentEscalations] = await Promise.all([
        founderRepository.listLeadsPaginated({ page: 1, limit: 5, businessId: id }),
        founderRepository.listAppointmentsPaginated({ page: 1, limit: 5, businessId: id }),
        founderRepository.listEscalationsPaginated({ page: 1, limit: 5, businessId: id }),
      ]);

      res.json({
        success: true,
        data: {
          ...business,
          recentLeads: recentLeads.rows,
          recentAppointments: recentAppointments.rows,
          recentEscalations: recentEscalations.rows,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('[Founder] getBusiness error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch business' });
    }
  }

  async listLeads(req: Request, res: Response): Promise<void> {
    try {
      const query = paginationSchema.parse(req.query);
      const search = req.query.search as string | undefined;
      const businessId = req.query.businessId as string | undefined;
      const status = req.query.status as string | undefined;

      if (businessId) uuidSchema.parse(businessId);

      const result = await founderRepository.listLeadsPaginated({
        page: query.page,
        limit: query.limit,
        search,
        businessId,
        status,
      });

      res.json({ success: true, data: result.rows, total: result.total, page: query.page, limit: query.limit });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('[Founder] listLeads error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch leads' });
    }
  }

  async listAppointments(req: Request, res: Response): Promise<void> {
    try {
      const query = paginationSchema.parse(req.query);
      const search = req.query.search as string | undefined;
      const businessId = req.query.businessId as string | undefined;
      const status = req.query.status as string | undefined;

      if (businessId) uuidSchema.parse(businessId);

      const result = await founderRepository.listAppointmentsPaginated({
        page: query.page,
        limit: query.limit,
        search,
        businessId,
        status,
      });

      res.json({ success: true, data: result.rows, total: result.total, page: query.page, limit: query.limit });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('[Founder] listAppointments error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch appointments' });
    }
  }

  async listEscalations(req: Request, res: Response): Promise<void> {
    try {
      const query = paginationSchema.parse(req.query);
      const search = req.query.search as string | undefined;
      const businessId = req.query.businessId as string | undefined;
      const status = req.query.status as string | undefined;

      if (businessId) uuidSchema.parse(businessId);

      const result = await founderRepository.listEscalationsPaginated({
        page: query.page,
        limit: query.limit,
        search,
        businessId,
        status,
      });

      res.json({ success: true, data: result.rows, total: result.total, page: query.page, limit: query.limit });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('[Founder] listEscalations error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch escalations' });
    }
  }

  async listSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const query = paginationSchema.parse(req.query);
      const status = req.query.status as string | undefined;

      const result = await founderRepository.listSubscriptionsPaginated({
        page: query.page,
        limit: query.limit,
        status,
      });

      res.json({ success: true, data: result.rows, total: result.total, page: query.page, limit: query.limit });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('[Founder] listSubscriptions error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch subscriptions' });
    }
  }

  async createSubscription(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        businessId: z.string().uuid(),
        planName: z.string().min(1),
        planType: z.string().min(1),
        amount: z.number().min(0),
        currency: z.string().default('INR'),
        billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
        trialEnd: z.string().optional(),
      });

      const data = schema.parse(req.body);
      const subscription = await founderRepository.createSubscription(data);
      res.status(201).json({ success: true, data: subscription });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('[Founder] createSubscription error:', error);
      res.status(500).json({ success: false, error: 'Failed to create subscription' });
    }
  }

  async updateSubscription(req: Request, res: Response): Promise<void> {
    try {
      const id = uuidSchema.parse(req.params.id);
      const schema = z.object({
        planName: z.string().min(1).optional(),
        planType: z.string().min(1).optional(),
        status: z.string().optional(),
        amount: z.number().min(0).optional(),
        billingCycle: z.enum(['monthly', 'yearly']).optional(),
        currentPeriodEnd: z.string().optional(),
      });

      const data = schema.parse(req.body);
      await founderRepository.updateSubscription(id, data);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('[Founder] updateSubscription error:', error);
      res.status(500).json({ success: false, error: 'Failed to update subscription' });
    }
  }

  async getSubscriptionHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await founderRepository.getSubscriptionHealth();
      res.json({ success: true, data: health });
    } catch (error) {
      console.error('[Founder] getSubscriptionHealth error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch subscription health' });
    }
  }

  async getSubscriptionEvents(req: Request, res: Response): Promise<void> {
    try {
      const id = uuidSchema.parse(req.params.id);
      const events = await founderRepository.getBillingEvents(id);
      res.json({ success: true, data: events });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('[Founder] getSubscriptionEvents error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch billing events' });
    }
  }

  async changeSubscriptionStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = uuidSchema.parse(req.params.id);
      const schema = z.object({
        status: z.enum(['active', 'past_due', 'suspended', 'cancelled']),
        note: z.string().optional(),
      });
      const { status, note } = schema.parse(req.body);

      const result = await subscriptionService.updateSubscriptionStatus(
        id, status, req.profile?.id, note
      );

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('[Founder] changeSubscriptionStatus error:', error);
      res.status(500).json({ success: false, error: 'Failed to change subscription status' });
    }
  }

  async updateBillingNotes(req: Request, res: Response): Promise<void> {
    try {
      const id = uuidSchema.parse(req.params.id);
      const schema = z.object({ notes: z.string() });
      const { notes } = schema.parse(req.body);

      await founderRepository.updateBillingNotes(id, notes);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('[Founder] updateBillingNotes error:', error);
      res.status(500).json({ success: false, error: 'Failed to update billing notes' });
    }
  }

  async listActivity(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        limit: z.coerce.number().int().min(1).max(100).default(20),
      });
      const { limit } = schema.parse(req.query);
      const events = await founderRepository.listActivity(limit);
      res.json({ success: true, data: events });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('[Founder] listActivity error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch activity' });
    }
  }
}

export const founderController = new FounderController();
