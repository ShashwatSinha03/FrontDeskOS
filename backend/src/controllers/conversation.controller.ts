import { Request, Response } from 'express';
import { z } from 'zod';
import { conversationRepository } from '../repositories';

export class ConversationController {
  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const id = z.string().uuid('Invalid conversation ID').parse(req.params.id);
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
