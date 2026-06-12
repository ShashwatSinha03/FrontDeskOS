import { Request, Response } from 'express';
import { z } from 'zod';
import { availabilityRepository } from '../repositories';

const uuidParam = z.string().uuid('Invalid UUID parameter');

export class AvailabilityController {
  async listSchedules(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;
      const schema = z.object({
        serviceId: z.string().uuid().optional(),
      });
      const parsed = schema.parse(req.query);
      const schedules = await availabilityRepository.findSchedules(businessId, parsed.serviceId);
      res.status(200).json({ success: true, data: schedules });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createSchedule(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;
      const schema = z.object({
        serviceId: z.string().uuid().nullable().optional(),
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        effectiveFrom: z.string().optional(),
        effectiveUntil: z.string().nullable().optional(),
      });
      const parsed = schema.parse(req.body);
      const schedule = await availabilityRepository.createSchedule({
        businessId,
        serviceId: parsed.serviceId,
        dayOfWeek: parsed.dayOfWeek,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        effectiveFrom: parsed.effectiveFrom ? new Date(parsed.effectiveFrom) : undefined,
        effectiveUntil: parsed.effectiveUntil ? new Date(parsed.effectiveUntil) : null,
      });
      res.status(201).json({ success: true, data: schedule });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteSchedule(req: Request, res: Response): Promise<void> {
    try {
      const id = uuidParam.parse(req.params.id);
      const businessId = req.membership!.businessId;
      await availabilityRepository.deleteSchedule(id, businessId);
      res.status(200).json({ success: true, message: 'Schedule deleted' });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async listOverrides(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;
      const schema = z.object({
        date: z.string().optional(),
      });
      const parsed = schema.parse(req.query);
      const date = parsed.date ? new Date(parsed.date) : undefined;
      const overrides = await availabilityRepository.findOverrides(businessId, date);
      res.status(200).json({ success: true, data: overrides });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createOverride(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;
      const schema = z.object({
        serviceId: z.string().uuid().nullable().optional(),
        date: z.string(),
        startTime: z.string().nullable().optional(),
        endTime: z.string().nullable().optional(),
        reason: z.string().nullable().optional(),
        isAvailable: z.boolean().optional(),
      });
      const parsed = schema.parse(req.body);
      const override = await availabilityRepository.createOverride({
        businessId,
        serviceId: parsed.serviceId,
        date: new Date(parsed.date),
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        reason: parsed.reason,
        isAvailable: parsed.isAvailable,
      });
      res.status(201).json({ success: true, data: override });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteOverride(req: Request, res: Response): Promise<void> {
    try {
      const id = uuidParam.parse(req.params.id);
      const businessId = req.membership!.businessId;
      await availabilityRepository.deleteOverride(id, businessId);
      res.status(200).json({ success: true, message: 'Override deleted' });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const availabilityController = new AvailabilityController();
