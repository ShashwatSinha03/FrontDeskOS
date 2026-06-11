import { Request, Response } from 'express';
import { z } from 'zod';
import { chatService } from '../services';

const chatMessageSchema = z.object({
  businessId: z.string().uuid('businessId must be a valid UUID'),
  channelType: z.enum(['web_chat', 'whatsapp', 'voice']),
  channelIdentity: z.string().min(1, 'channelIdentity is required'),
  content: z.string().min(1, 'message content cannot be empty'),
  customerName: z.string().optional(),
  customerEmail: z.string().email('Invalid email format').optional(),
  customerPhone: z.string().optional(),
  sessionId: z.string().optional(),
});

export class ChatController {
  /**
   * Route handler for incoming customer inquiry messages.
   */
  async handleMessage(req: Request, res: Response): Promise<void> {
    try {
      // Validate request payload
      const parsed = chatMessageSchema.parse(req.body);
      
      // Coordinate logic through service layers
      const result = await chatService.handleIncomingMessage(parsed);
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          errors: error.errors 
        });
        return;
      }
      
      console.error('❌ Error handling chat message:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Internal server error' 
      });
    }
  }
}

export const chatController = new ChatController();
export default chatController;
