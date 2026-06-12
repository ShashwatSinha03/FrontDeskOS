import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/db';
import {
  customerRepository,
  appointmentRepository,
  conversationRepository,
  escalationRepository,
  followUpRepository,
  lifecycleEventRepository,
} from '../repositories';
import { CustomerLifecycleState } from '../types';

const uuidParam = z.string().uuid('Invalid UUID parameter');

const allLifecycleStates: CustomerLifecycleState[] = [
  'New Inquiry', 'Information Gathering', 'Qualified', 'Booking Opportunity',
  'Booked', 'Customer', 'Follow-Up Pending', 'Escalated', 'Lost',
];

export class OwnerController {
  async getCustomerDetail(req: Request, res: Response): Promise<void> {
    try {
      const id = uuidParam.parse(req.params.id);
      const businessId = req.membership!.businessId;

      const customer = await customerRepository.findById(id);
      if (!customer || customer.businessId !== businessId) {
        res.status(404).json({ success: false, error: 'Customer not found' });
        return;
      }

      const [appointments, conversations, escalations, followUps, lifecycleEvents] = await Promise.all([
        appointmentRepository.findByCustomerWithDetails(id),
        conversationRepository.findByCustomer(id),
        escalationRepository.findByCustomer(id),
        followUpRepository.findByCustomerWithName(id),
        lifecycleEventRepository.findByCustomer(id),
      ]);

      let messages: any[] = [];
      if (conversations.length > 0) {
        const result = await conversationRepository.getMessages(conversations[0].id, { limit: 100, offset: 0 });
        messages = result.messages;
      }

      res.status(200).json({
        success: true,
        data: {
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            lifecycleState: customer.lifecycleState,
            lastInteractionAt: customer.lastInteractionAt,
            createdAt: customer.createdAt,
          },
          appointments,
          conversations: conversations.map(c => ({
            id: c.id,
            channelType: c.channelType,
            status: c.status,
            createdAt: c.createdAt,
          })),
          messages,
          escalations,
          followUps,
          lifecycleEvents,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('❌ Error fetching customer detail:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateLifecycle(req: Request, res: Response): Promise<void> {
    try {
      const id = uuidParam.parse(req.params.id);
      const businessId = req.membership!.businessId;
      const schema = z.object({
        lifecycleState: z.enum(allLifecycleStates as [string, ...string[]]),
      });
      const { lifecycleState } = schema.parse(req.body);

      const customer = await customerRepository.findById(id);
      if (!customer || customer.businessId !== businessId) {
        res.status(404).json({ success: false, error: 'Customer not found' });
        return;
      }

      await customerRepository.updateLifecycleState(id, lifecycleState as CustomerLifecycleState, 'owner:manual_change');
      res.status(200).json({ success: true, message: `Lifecycle updated to ${lifecycleState}` });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getCustomerConversations(req: Request, res: Response): Promise<void> {
    try {
      const id = uuidParam.parse(req.params.id);
      const businessId = req.membership!.businessId;

      const customer = await customerRepository.findById(id);
      if (!customer || customer.businessId !== businessId) {
        res.status(404).json({ success: false, error: 'Customer not found' });
        return;
      }

      const conversations = await conversationRepository.findByCustomer(id);

      res.status(200).json({
        success: true,
        data: conversations.map(c => ({
          id: c.id,
          channelType: c.channelType,
          status: c.status,
          createdAt: c.createdAt,
        })),
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createLead(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;
      const schema = z.object({
        name: z.string().min(1).max(200),
        email: z.string().email().optional().nullable(),
        phone: z.string().optional().nullable(),
      });
      const { name, email, phone } = schema.parse(req.body);

      const customer = await customerRepository.create(businessId, name, email || null, phone || null);

      res.status(201).json({ success: true, data: customer });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateCustomerProfile(req: Request, res: Response): Promise<void> {
    try {
      const id = uuidParam.parse(req.params.id);
      const businessId = req.membership!.businessId;
      const schema = z.object({
        name: z.string().min(1).max(200).optional(),
        email: z.string().email().optional().nullable(),
        phone: z.string().optional().nullable(),
      });
      const updates = schema.parse(req.body);

      const customer = await customerRepository.findById(id);
      if (!customer || customer.businessId !== businessId) {
        res.status(404).json({ success: false, error: 'Customer not found' });
        return;
      }

      const filtered: { name?: string; email?: string | null; phone?: string | null } = {};
      if (updates.name !== undefined) filtered.name = updates.name;
      if (updates.email !== undefined) filtered.email = updates.email;
      if (updates.phone !== undefined) filtered.phone = updates.phone;

      if (Object.keys(filtered).length > 0) {
        await customerRepository.updateProfile(id, filtered);
      }

      const updated = await customerRepository.findById(id);
      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const ownerController = new OwnerController();
export default ownerController;
