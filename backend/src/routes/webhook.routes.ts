import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';
import { createRateLimiter } from '../middleware/rate-limit';

const webhookRouter = Router();

const webhookLimiter = createRateLimiter(60, 60 * 1000);

webhookRouter.use(webhookLimiter);

webhookRouter.get('/webhooks/twilio/whatsapp', (req, res) => webhookController.handleWhatsAppVerification(req, res));

webhookRouter.post('/webhooks/twilio/whatsapp', (req, res) => webhookController.handleWhatsAppInbound(req, res));

webhookRouter.post('/webhooks/twilio/status', (req, res) => webhookController.handleWhatsAppStatus(req, res));

export { webhookRouter };
