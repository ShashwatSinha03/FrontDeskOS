import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import pool from '../config/db';
import { businessRepository, sessionRepository, customerRepository, conversationRepository } from '../repositories';

export class PublicController {
  async getBusiness(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const business = await businessRepository.findBySlug(slug);
      if (!business) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }

      const servicesQuery = `
        SELECT id, name, description, price_min, price_max, duration_minutes
        FROM services
        WHERE business_id = $1 AND is_active = true
        ORDER BY name ASC
      `;
      const servicesRes = await pool.query(servicesQuery, [business.id]);

      res.status(200).json({
        success: true,
        data: {
          id: business.id,
          name: business.name,
          phone: business.phone || null,
          email: business.email || null,
          address: business.address || null,
          description: business.description || null,
          logoUrl: business.logoUrl || null,
          timezone: business.timezone,
          faqs: business.faqs,
          services: servicesRes.rows.map((r: any) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            priceMin: parseFloat(r.price_min),
            priceMax: parseFloat(r.price_max),
            durationMinutes: r.duration_minutes,
          })),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getServices(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const business = await businessRepository.findBySlug(slug);
      if (!business) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }

      const servicesQuery = `
        SELECT id, name, description, price_min, price_max, duration_minutes
        FROM services
        WHERE business_id = $1 AND is_active = true
        ORDER BY name ASC
      `;
      const servicesRes = await pool.query(servicesQuery, [business.id]);

      res.status(200).json({
        success: true,
        data: servicesRes.rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          priceMin: parseFloat(r.price_min),
          priceMax: parseFloat(r.price_max),
          durationMinutes: r.duration_minutes,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async submitContact(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Valid email is required'),
        message: z.string().min(1, 'Message is required'),
        sessionId: z.string().optional(),
      });

      const { slug } = req.params;
      const business = await businessRepository.findBySlug(slug);
      if (!business) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }

      const parsed = schema.parse(req.body);
      const channelIdentity = parsed.sessionId || `contact-${crypto.randomUUID()}`;

      let customer = await customerRepository.findByChannelIdentity('web_chat', channelIdentity);
      if (!customer) {
        customer = await customerRepository.create(
          business.id,
          parsed.name,
          parsed.email,
          null
        );
        await customerRepository.linkChannel(customer.id, 'web_chat', channelIdentity);
      }

      const conversation = await conversationRepository.findActiveByCustomer(customer.id)
        || await conversationRepository.create(customer.id, business.id, 'web_chat');

      await conversationRepository.addMessage(conversation.id, 'customer', parsed.message, {
        source: 'contact_form',
      });

      res.status(201).json({
        success: true,
        data: {
          customerId: customer.id,
          conversationId: conversation.id,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createSession(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        businessId: z.string().uuid('businessId must be a valid UUID'),
        sessionId: z.string().optional(),
      });

      const parsed = schema.parse(req.body);

      if (parsed.sessionId) {
        const existing = await sessionRepository.findBySessionId(parsed.sessionId);
        if (existing) {
          res.status(200).json({
            success: true,
            data: {
              sessionId: existing.sessionId,
              customerId: existing.customerId,
            },
          });
          return;
        }
      }

      const newSessionId = parsed.sessionId || crypto.randomUUID();
      const session = await sessionRepository.create(parsed.businessId, newSessionId);

      res.status(201).json({
        success: true,
        data: {
          sessionId: session.sessionId,
          customerId: session.customerId,
        },
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

export const publicController = new PublicController();
export default publicController;
