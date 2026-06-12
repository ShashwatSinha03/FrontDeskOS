import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/db';
import { conversationRepository } from '../repositories';

export class ConversationController {
  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const id = z.string().uuid('Invalid conversation ID').parse(req.params.id);
      const businessId = req.membership!.businessId;

      // V-002 fix: verify conversation belongs to the caller's business
      const convCheck = await pool.query(
        'SELECT business_id FROM conversations WHERE id = $1',
        [id]
      );
      if (convCheck.rows.length === 0 || convCheck.rows[0].business_id !== businessId) {
        res.status(404).json({ success: false, error: 'Conversation not found' });
        return;
      }

      const schema = z.object({
        limit: z.coerce.number().int().min(1).max(200).default(50),
        offset: z.coerce.number().int().min(0).default(0),
      });
      const parsed = schema.parse(req.query);
      const { messages, totalCount } = await conversationRepository.getMessages(id, {
        limit: parsed.limit,
        offset: parsed.offset,
      });
      res.status(200).json({
        success: true,
        data: messages,
        meta: { totalCount, limit: parsed.limit, offset: parsed.offset },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const conversationController = new ConversationController();
