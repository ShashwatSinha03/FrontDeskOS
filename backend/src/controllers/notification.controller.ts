import { Request, Response } from 'express';
import { z } from 'zod';
import { notificationRepository } from '../repositories';

export class NotificationController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;
      const schema = z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      });
      const { page, limit } = schema.parse(req.query);
      const result = await notificationRepository.findByBusiness(businessId, { page, limit });
      const totalPages = Math.ceil(result.totalCount / limit);
      res.json({
        success: true,
        data: result.notifications,
        meta: { totalCount: result.totalCount, totalPages, currentPage: page, limit },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('[Notifications] List error:', error);
      res.status(500).json({ success: false, error: 'Failed to load notifications' });
    }
  }

  async markRead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const businessId = req.membership!.businessId;
      await notificationRepository.markRead(id, businessId);
      res.json({ success: true, data: { id, isRead: true } });
    } catch (error) {
      console.error('[Notifications] Mark read error:', error);
      res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
    }
  }

  async markAllRead(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;
      await notificationRepository.markAllRead(businessId);
      res.json({ success: true, data: { markedAllRead: true } });
    } catch (error) {
      console.error('[Notifications] Mark all read error:', error);
      res.status(500).json({ success: false, error: 'Failed to mark all as read' });
    }
  }

  async unreadCount(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;
      const count = await notificationRepository.countUnread(businessId);
      res.json({ success: true, data: { count } });
    } catch (error) {
      console.error('[Notifications] Unread count error:', error);
      res.status(500).json({ success: false, error: 'Failed to get unread count' });
    }
  }
}

export const notificationController = new NotificationController();
