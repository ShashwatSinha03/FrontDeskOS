import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/db';
import { conversationRepository, escalationRepository } from '../repositories';
import { deliveryService } from '../services/channel/delivery.service';
import { notificationService } from '../services/notification.service';
import { logger } from '../lib/logger';

export class InboxController {
  async getInboxConversations(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;
      const schema = z.object({
        ownershipStatus: z.enum(['human_pending', 'human_active', 'returned_to_ai', 'closed']).optional(),
        search: z.string().optional(),
        channelType: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      });
      const params = schema.parse(req.query);

      const result = await conversationRepository.getInboxConversations(
        businessId,
        {
          ownershipStatus: params.ownershipStatus,
          search: params.search,
          channelType: params.channelType,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        },
        { page: params.page, limit: params.limit }
      );

      const totalPages = Math.ceil(result.totalCount / params.limit);
      res.json({
        success: true,
        data: result.conversations,
        meta: { totalCount: result.totalCount, totalPages, currentPage: params.page, limit: params.limit },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to load inbox conversations', { route: 'Inbox', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to load inbox conversations' });
    }
  }

  async getInboxCounts(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;
      const counts = await conversationRepository.getInboxCounts(businessId);
      res.json({ success: true, data: counts });
    } catch (error: any) {
      logger.error('Failed to get inbox counts', { route: 'Inbox', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to get inbox counts' });
    }
  }

  async joinConversation(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const businessId = req.membership!.businessId;
      const userId = req.user!.id;

      const updated = await conversationRepository.updateOwnershipStatus(
        conversationId,
        businessId,
        'human_active',
        userId
      );

      await escalationRepository.resolveForConversation(conversationId, businessId);

      await pool.query(
        `UPDATE escalations SET first_response_at = NOW() WHERE conversation_id = $1 AND business_id = $2 AND first_response_at IS NULL`,
        [conversationId, businessId]
      );

      res.json({ success: true, data: updated });
    } catch (error: any) {
      logger.error('Failed to join conversation', { route: 'Inbox', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to join conversation' });
    }
  }

  async returnToAI(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const businessId = req.membership!.businessId;

      const updated = await conversationRepository.updateOwnershipStatus(
        conversationId,
        businessId,
        'ai_active'
      );

      await escalationRepository.resolveForConversation(conversationId, businessId);

      await pool.query(
        `UPDATE escalations SET returned_to_ai_count = returned_to_ai_count + 1 WHERE conversation_id = $1 AND business_id = $2`,
        [conversationId, businessId]
      );

      res.json({ success: true, data: updated });
    } catch (error: any) {
      logger.error('Failed to return conversation to AI', { route: 'Inbox', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to return conversation to AI' });
    }
  }

  async sendOwnerMessage(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const businessId = req.membership!.businessId;
      const schema = z.object({
        content: z.string().min(1).max(10000),
      });
      const { content } = schema.parse(req.body);

      const convResult = await conversationRepository.findById(conversationId, businessId);
      if (!convResult) {
        res.status(404).json({ success: false, error: 'Conversation not found' });
        return;
      }

      const message = await conversationRepository.addMessage(
        conversationId,
        'human_owner',
        content
      );

      deliveryService.sendMessage({
        businessId,
        customerId: convResult.customerId,
        conversationId,
        messageId: message.id,
        channelType: convResult.channelType,
        content,
        metadata: { sender: 'human_owner' },
      }).catch((err: Error) => {
        logger.error('Delivery service error for owner message', { route: 'Inbox', businessId, conversationId, error: err.message });
      });

      res.json({ success: true, data: message });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to send owner message', { route: 'Inbox', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to send owner message' });
    }
  }

  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;

      const result = await pool.query(`
        SELECT
          COUNT(*)::int AS total_escalations,
          COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved_escalations,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS unresolved_escalations,
          COALESCE(SUM(returned_to_ai_count), 0)::int AS total_returned_to_ai,
          ROUND(AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60)::numeric, 1) AS avg_first_response_minutes,
          ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60)::numeric, 1) AS avg_resolution_minutes
        FROM escalations
        WHERE business_id = $1
      `, [businessId]);

      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      logger.error('Failed to get escalation metrics', { route: 'Inbox', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to get escalation metrics' });
    }
  }
}

export const inboxController = new InboxController();
