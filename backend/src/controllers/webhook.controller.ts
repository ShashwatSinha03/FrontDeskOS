import { Request, Response } from 'express';
import twilio from 'twilio';
import config from '../config';
import { whatsappWebhookHandler } from '../services/channel/whatsapp-webhook.handler';
import { logger } from '../lib/logger';

export class WebhookController {
  private validateTwilioRequest(req: Request, res: Response): boolean {
    const authToken = config.TWILIO_AUTH_TOKEN;

    if (!authToken) {
      logger.error('Webhook disabled: TWILIO_AUTH_TOKEN is not configured');
      res.status(500).send('Webhook disabled');
      return false;
    }

    const twilioSignature = req.headers['x-twilio-signature'] as string | undefined;

    if (!twilioSignature) {
      logger.warn('Missing Twilio signature header');
      res.status(403).send('Forbidden');
      return false;
    }

    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    if (typeof twilio.validateRequest !== 'function') {
      logger.error('Webhook disabled: twilio.validateRequest is not available');
      res.status(500).send('Webhook disabled');
      return false;
    }

    const isValid = twilio.validateRequest(authToken, twilioSignature, url, req.body);

    if (!isValid) {
      logger.warn('Invalid Twilio webhook signature', { url, path: req.originalUrl });
      res.status(403).send('Forbidden');
      return false;
    }

    return true;
  }

  async handleWhatsAppInbound(req: Request, res: Response): Promise<void> {
    if (!this.validateTwilioRequest(req, res)) return;

    try {
      await whatsappWebhookHandler.handleInbound(req);
      res.status(200).type('text/xml').send('<Response></Response>');
    } catch (err) {
      logger.error('WhatsApp webhook handler error', {
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(200).type('text/xml').send('<Response></Response>');
    }
  }

  async handleWhatsAppStatus(req: Request, res: Response): Promise<void> {
    if (!this.validateTwilioRequest(req, res)) return;

    try {
      await whatsappWebhookHandler.handleStatusCallback(req);
      res.status(200).send('OK');
    } catch (err) {
      logger.error('WhatsApp status callback error', {
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(200).send('OK');
    }
  }

  async handleWhatsAppVerification(req: Request, res: Response): Promise<void> {
    const challenge = req.query['hub.challenge'] as string | undefined;
    const verifyToken = req.query['hub.verify_token'] as string | undefined;
    const expectedToken = config.META_VERIFY_TOKEN || '';

    logger.info('Meta webhook verification request', {
      query: req.query,
      hasChallenge: !!challenge,
      hasToken: !!verifyToken,
    });

    if (challenge && verifyToken && verifyToken === expectedToken) {
      res.status(200).send(challenge);
      return;
    }

    // No fallthrough — if token is missing or doesn't match, reject
    res.status(403).send('Verification failed');
  }
}

export const webhookController = new WebhookController();
