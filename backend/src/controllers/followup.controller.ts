import { Request, Response } from 'express';
import { z } from 'zod';
import { followUpRepository } from '../repositories';
import { FollowUpStatus, FollowUpType } from '../types';

export class FollowUpController {
  /**
   * List paginated follow-up automated message schedules for a business.
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;
      const schema = z.object({
        status: z.enum(['pending', 'sent', 'cancelled']).optional(),
        type: z.enum(['re_engagement', 'day_1', 'day_3']).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(10),
      });

      const parsed = schema.parse(req.query);
      const { followUps, totalCount } = await followUpRepository.findByBusiness(
        businessId,
        { 
          status: parsed.status as FollowUpStatus, 
          type: parsed.type as FollowUpType 
        },
        { 
          page: parsed.page, 
          limit: parsed.limit 
        }
      );

      const totalPages = Math.ceil(totalCount / parsed.limit);

      res.status(200).json({
        success: true,
        data: followUps,
        meta: {
          totalCount,
          totalPages,
          currentPage: parsed.page,
          limit: parsed.limit,
        }
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Manually cancel a pending follow-up message.
   */
  async cancel(req: Request, res: Response): Promise<void> {
    try {
      const id = z.string().uuid('Invalid follow-up ID').parse(req.params.id);
      const businessId = req.membership!.businessId;

      await followUpRepository.cancelById(id, businessId);
      res.status(200).json({ 
        success: true, 
        message: 'Follow-up successfully cancelled.' 
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const followUpController = new FollowUpController();
export default followUpController;
