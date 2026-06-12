import { Request, Response } from 'express';
import { z } from 'zod';
import { appointmentService } from '../services';
import { notificationService } from '../services/notification.service';
import { appointmentRepository, sessionRepository, customerRepository, conversationRepository } from '../repositories';

const uuidParam = z.string().uuid('Invalid UUID parameter');

export class AppointmentController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        status: z.enum(['pending', 'confirmed', 'cancelled', 'rescheduled']).optional(),
        startDate: z.string().datetime({ message: 'startDate must be a valid ISO datetime' }).optional(),
        endDate: z.string().datetime({ message: 'endDate must be a valid ISO datetime' }).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(10),
      });

      const businessId = req.membership!.businessId;
      const parsed = schema.parse(req.query);
      const start = parsed.startDate ? new Date(parsed.startDate) : undefined;
      const end = parsed.endDate ? new Date(parsed.endDate) : undefined;

      const { appointments, totalCount } = await appointmentRepository.findByBusiness(
        businessId,
        { status: parsed.status, startDate: start, endDate: end },
        { page: parsed.page, limit: parsed.limit }
      );

      const totalPages = Math.ceil(totalCount / parsed.limit);

      res.status(200).json({
        success: true,
        data: appointments,
        meta: {
          totalCount,
          totalPages,
          currentPage: parsed.page,
          limit: parsed.limit,
        }
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async book(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        customerId: z.string().uuid('customerId must be a valid UUID').optional(),
        businessId: z.string().uuid('businessId must be a valid UUID'),
        serviceId: z.string().uuid('serviceId must be a valid UUID').nullable(),
        appointmentTime: z.string().datetime({ message: 'appointmentTime must be a valid ISO datetime' }),
        notes: z.string().optional(),
        sessionId: z.string().optional(),
        name: z.string().optional(),
        email: z.string().email('Invalid email format').optional(),
        phone: z.string().optional(),
      });

      const parsed = schema.parse(req.body);
      const businessId = req.membership?.businessId ?? parsed.businessId;

      let customerId = parsed.customerId;
      if (!customerId && parsed.sessionId) {
        const session = await sessionRepository.findBySessionId(parsed.sessionId);
        if (session?.customerId) {
          customerId = session.customerId;
        } else {
          if (!parsed.name && !parsed.email && !parsed.phone) {
            res.status(400).json({ success: false, error: 'Customer identity required' });
            return;
          }
          const customer = await customerRepository.create(
            businessId,
            parsed.name ?? null,
            parsed.email ?? null,
            parsed.phone ?? null
          );
          customerId = customer.id;
          if (session) {
            await sessionRepository.updateCustomer(session.sessionId, customer.id);
          }
          await conversationRepository.create(customerId, businessId, 'web_chat');
        }
      }
      if (!customerId) {
        res.status(400).json({ success: false, error: 'customerId is required when no sessionId is provided' });
        return;
      }

      const appointment = await appointmentService.scheduleAppointment({
        customerId,
        businessId,
        serviceId: parsed.serviceId,
        appointmentTime: new Date(parsed.appointmentTime),
        notes: parsed.notes,
      });

      const bookCustomer = await customerRepository.findById(customerId);
      const bookName = bookCustomer?.name || parsed.name || 'A customer';
      notificationService.create({
        businessId,
        type: 'appointment_booked',
        title: 'Appointment Booked',
        message: `${bookName} booked an appointment on ${new Date(parsed.appointmentTime).toLocaleString()}.`,
        entityType: 'appointment',
        entityId: appointment.id,
      }).catch((err) => console.error('[Notifications] Failed to create appointment_booked:', err));

      res.status(201).json({
        success: true,
        data: appointment,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({
        success: false,
        error: error.message || 'Error booking appointment'
      });
    }
  }

  async getSlots(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        businessId: z.string().uuid('businessId is required and must be a valid UUID'),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
        serviceId: z.string().uuid().optional(),
      });

      const parsed = schema.parse(req.query);
      const slots = await appointmentService.getAvailableSlots(
        parsed.businessId,
        parsed.date,
        parsed.serviceId
      );

      res.status(200).json({
        success: true,
        data: slots,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({
        success: false,
        error: error.message || 'Error fetching available slots'
      });
    }
  }

  async cancel(req: Request, res: Response): Promise<void> {
    try {
      const id = uuidParam.parse(req.params.id);
      const businessId = req.membership!.businessId;
      const schema = z.object({
        reason: z.string().optional(),
      });
      const parsed = schema.parse(req.body);
      await appointmentService.cancelAppointment(id, businessId, parsed.reason);
      res.status(200).json({
        success: true,
        message: 'Appointment cancelled successfully'
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({
        success: false,
        error: error.message || 'Error cancelling appointment'
      });
    }
  }

  async reschedule(req: Request, res: Response): Promise<void> {
    try {
      const id = uuidParam.parse(req.params.id);
      const businessId = req.membership!.businessId;
      const schema = z.object({
        newTime: z.string().datetime({ message: 'newTime must be a valid ISO datetime' }),
        notes: z.string().optional(),
      });
      const parsed = schema.parse(req.body);
      const appointment = await appointmentService.rescheduleAppointment(
        id,
        businessId,
        new Date(parsed.newTime),
        parsed.notes
      );
      res.status(200).json({ success: true, data: appointment });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async confirm(req: Request, res: Response): Promise<void> {
    try {
      const id = uuidParam.parse(req.params.id);
      const businessId = req.membership!.businessId;
      await appointmentService.confirmAppointment(id, businessId);
      res.status(200).json({ success: true, message: 'Appointment confirmed' });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async complete(req: Request, res: Response): Promise<void> {
    try {
      const id = uuidParam.parse(req.params.id);
      const businessId = req.membership!.businessId;
      await appointmentService.completeAppointment(id, businessId);
      res.status(200).json({ success: true, message: 'Appointment completed' });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const appointmentController = new AppointmentController();
export default appointmentController;
