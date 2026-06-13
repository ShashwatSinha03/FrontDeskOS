import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/db';
import {
  customerRepository,
  appointmentRepository,
  escalationRepository,
} from '../repositories';
import { notificationService } from '../services/notification.service';
import { CustomerLifecycleState, AppointmentStatus, EscalationStatus } from '../types';
import { logger } from '../lib/logger';

const LEAD_STATES: CustomerLifecycleState[] = [
  'New Inquiry', 'Information Gathering', 'Qualified',
  'Booking Opportunity', 'Booked', 'Customer', 'Follow-Up Pending', 'Escalated', 'Lost',
];

export class OperationalController {
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const [apptsResult, leadsResult, escalationsResult, funnelResult, activityResult] = await Promise.all([
        appointmentRepository.findByBusiness(businessId, {
          startDate: todayStart,
          endDate: todayEnd,
        }, { page: 1, limit: 20 }),
        customerRepository.findAllByBusiness(businessId, {}, { page: 1, limit: 10 }),
        escalationRepository.findByBusiness(businessId, { status: 'pending' }, { page: 1, limit: 10 }),
        pool.query(`
          SELECT lifecycle_state, COUNT(*)::int AS count
          FROM customers
          WHERE business_id = $1
          GROUP BY lifecycle_state
        `, [businessId]),
        this.getRecentActivity(businessId),
      ]);

      const funnel = { new: 0, contacted: 0, qualified: 0, won: 0 };
      for (const row of funnelResult.rows) {
        const state = row.lifecycle_state as string;
        if (state === 'New Inquiry' || state === 'Information Gathering') funnel.new += row.count;
        else if (state === 'Qualified') funnel.qualified += row.count;
        else if (state === 'Booking Opportunity' || state === 'Booked' || state === 'Customer') funnel.contacted += row.count;
        else if (state === 'Follow-Up Pending' || state === 'Escalated') funnel.contacted += row.count;
        else if (state === 'Lost') { /* skip */ }
      }
      // Count won from customers that reached booking/customer stage
      funnel.won = (funnelResult.rows.find((r: any) => r.lifecycle_state === 'Customer')?.count || 0)
        + (funnelResult.rows.find((r: any) => r.lifecycle_state === 'Booked')?.count || 0);

      res.json({
        success: true,
        data: {
          todayAppointments: apptsResult.appointments.map((a: any) => ({
            id: a.id,
            customerName: a.customerName,
            serviceName: a.serviceName,
            time: a.appointmentTime,
            status: a.status,
            customerId: a.customerId,
          })),
          openLeads: leadsResult.customers.filter((c: any) => c.lifecycleState !== 'Lost').slice(0, 5).map((c: any) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            lifecycleState: c.lifecycleState,
            lastInteractionAt: c.lastInteractionAt,
          })),
          pendingEscalations: escalationsResult.escalations.slice(0, 5).map((e: any) => ({
            id: e.id,
            customerName: e.customerName,
            reason: e.reason,
            createdAt: e.createdAt,
            customerId: e.customerId,
          })),
          leadFunnel: funnel,
          recentActivity: activityResult,
        },
      });
    } catch (error) {
      logger.error('Failed to load dashboard', { route: 'Operate', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to load dashboard' });
    }
  }

  async getLeads(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;
      const schema = z.object({
        state: z.string().optional(),
        search: z.string().optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(10),
      });
      const { state, search, page, limit } = schema.parse(req.query);

      const lifecycleState = state ? state as CustomerLifecycleState : undefined;
      const { customers, totalCount } = await customerRepository.findAllByBusiness(
        businessId,
        { lifecycleState, search },
        { page, limit },
      );

      const totalPages = Math.ceil(totalCount / limit);
      res.json({ success: true, data: customers, meta: { totalCount, totalPages, currentPage: page, limit } });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to load leads', { route: 'Operate', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to load leads' });
    }
  }

  async updateLeadLifecycle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const businessId = req.membership!.businessId;
      const schema = z.object({ lifecycleState: z.enum(LEAD_STATES as [string, ...string[]]) });
      const { lifecycleState } = schema.parse(req.body);

      const customer = await customerRepository.findById(id, businessId);
      if (!customer || customer.businessId !== businessId) {
        res.status(404).json({ success: false, error: 'Lead not found' });
        return;
      }

      await customerRepository.updateLifecycleState(id, lifecycleState as CustomerLifecycleState, 'dashboard:manual_update');

      const name = customer.name || 'A lead';
      if (lifecycleState === 'Qualified') {
        await notificationService.create({
          businessId, type: 'lead_qualified', title: 'Lead Qualified',
          message: `${name} was qualified.`, entityType: 'customer', entityId: id,
        });
      } else if (lifecycleState === 'Customer' || lifecycleState === 'Booked') {
        await notificationService.create({
          businessId, type: 'lead_won', title: 'Lead Won',
          message: `${name} became a customer.`, entityType: 'customer', entityId: id,
        });
      } else if (lifecycleState === 'Lost') {
        await notificationService.create({
          businessId, type: 'lead_lost', title: 'Lead Lost',
          message: `${name} was marked as lost.`, entityType: 'customer', entityId: id,
        });
      }

      res.json({ success: true, data: { id, lifecycleState } });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to update lead status', { route: 'Operate', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to update lead status' });
    }
  }

  async getAppointments(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;
      const schema = z.object({
        status: z.string().optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(10),
      });
      const { status, page, limit } = schema.parse(req.query);

      const filters: any = {};
      if (status && status !== 'all') filters.status = status as AppointmentStatus;

      const { appointments, totalCount } = await appointmentRepository.findByBusiness(businessId, filters, { page, limit });
      const totalPages = Math.ceil(totalCount / limit);

      res.json({ success: true, data: appointments, meta: { totalCount, totalPages, currentPage: page, limit } });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to load appointments', { route: 'Operate', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to load appointments' });
    }
  }

  async updateAppointmentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const businessId = req.membership!.businessId;
      const schema = z.object({ status: z.enum(['confirmed', 'completed', 'cancelled']) });
      const { status } = schema.parse(req.body);

      const appointment = await appointmentRepository.findById(id, businessId);
      if (!appointment || appointment.businessId !== businessId) {
        res.status(404).json({ success: false, error: 'Appointment not found' });
        return;
      }

      await appointmentRepository.updateStatus(id, status as AppointmentStatus, businessId);

      const custResult = await pool.query('SELECT name FROM customers WHERE id = $1', [appointment.customerId]);
      const custName = custResult.rows[0]?.name || 'A customer';
      if (status === 'confirmed') {
        await notificationService.create({
          businessId, type: 'appointment_confirmed', title: 'Appointment Confirmed',
          message: `Appointment with ${custName} confirmed.`, entityType: 'appointment', entityId: id,
        });
      } else if (status === 'completed') {
        await notificationService.create({
          businessId, type: 'appointment_completed', title: 'Appointment Completed',
          message: `Appointment with ${custName} completed.`, entityType: 'appointment', entityId: id,
        });
      } else if (status === 'cancelled') {
        await notificationService.create({
          businessId, type: 'appointment_cancelled', title: 'Appointment Cancelled',
          message: `Appointment with ${custName} cancelled.`, entityType: 'appointment', entityId: id,
        });
      }

      res.json({ success: true, data: { id, status } });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to update appointment', { route: 'Operate', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to update appointment' });
    }
  }

  async rescheduleAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const businessId = req.membership!.businessId;
      const schema = z.object({
        appointmentTime: z.string().datetime({ message: 'Invalid datetime' }),
        notes: z.string().optional(),
      });
      const { appointmentTime, notes } = schema.parse(req.body);

      const appointment = await appointmentRepository.findById(id, businessId);
      if (!appointment || appointment.businessId !== businessId) {
        res.status(404).json({ success: false, error: 'Appointment not found' });
        return;
      }

      await appointmentRepository.reschedule(id, new Date(appointmentTime), notes);

      const custResult = await pool.query('SELECT name FROM customers WHERE id = $1', [appointment.customerId]);
      const custName = custResult.rows[0]?.name || 'A customer';
      await notificationService.create({
        businessId, type: 'appointment_rescheduled', title: 'Appointment Rescheduled',
        message: `Appointment with ${custName} rescheduled to ${new Date(appointmentTime).toLocaleString()}.`,
        entityType: 'appointment', entityId: id,
      });

      res.json({ success: true, data: { id, appointmentTime } });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to reschedule appointment', { route: 'Operate', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to reschedule appointment' });
    }
  }

  async getEscalations(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;
      const schema = z.object({
        status: z.string().optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(10),
      });
      const { status, page, limit } = schema.parse(req.query);

      const filters: any = {};
      if (status && status !== 'all') filters.status = status as EscalationStatus;

      const { escalations, totalCount } = await escalationRepository.findByBusiness(businessId, filters, { page, limit });
      const totalPages = Math.ceil(totalCount / limit);

      res.json({ success: true, data: escalations, meta: { totalCount, totalPages, currentPage: page, limit } });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to load escalations', { route: 'Operate', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to load escalations' });
    }
  }

  async resolveEscalation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const businessId = req.membership!.businessId;
      const schema = z.object({ resolutionNote: z.string().optional() });
      const { resolutionNote } = schema.parse(req.body);

      const escResult = await pool.query('SELECT * FROM escalations WHERE id = $1 AND business_id = $2', [id, businessId]);
      if (escResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Escalation not found' });
        return;
      }
      const escalation = escResult.rows[0];

      await escalationRepository.resolve(id, businessId);

      if (resolutionNote) {
        await pool.query(
          `UPDATE escalations SET resolved_by = $1, resolution_note = $2 WHERE id = $3 AND business_id = $4`,
          [req.user!.id, resolutionNote, id, businessId],
        );
      } else {
        await pool.query(
          `UPDATE escalations SET resolved_by = $1 WHERE id = $2 AND business_id = $3`,
          [req.user!.id, id, businessId],
        );
      }

      const custResult = await pool.query('SELECT name FROM customers WHERE id = $1', [escalation.customer_id]);
      const custName = custResult.rows[0]?.name || 'A customer';
      await notificationService.create({
        businessId, type: 'escalation_resolved', title: 'Escalation Resolved',
        message: `Escalation for ${custName} resolved.`,
        entityType: 'escalation', entityId: id,
      });

      res.json({ success: true, data: { id, resolved: true } });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to resolve escalation', { route: 'Operate', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to resolve escalation' });
    }
  }

  private async getRecentActivity(businessId: string, limit = 20) {
    const query = `
      SELECT event_type, occurred_at, description, customer_id, customer_name
      FROM (
        SELECT 'lead_created' AS event_type, created_at AS occurred_at,
          'Lead captured: ' || COALESCE(name, 'Unknown') AS description,
          id AS customer_id, name AS customer_name
        FROM customers WHERE business_id = $1
        UNION ALL
        SELECT 'appointment_booked', created_at,
          'Appointment booked' || CASE WHEN status = 'confirmed' THEN ' (confirmed)' WHEN status = 'cancelled' THEN ' (cancelled)' ELSE '' END,
          customer_id, NULL
        FROM appointments WHERE business_id = $1 AND created_at > NOW() - INTERVAL '90 days'
        UNION ALL
        SELECT 'escalation_raised', created_at,
          'Escalation: ' || LEFT(reason, 80),
          customer_id, NULL
        FROM escalations WHERE business_id = $1 AND created_at > NOW() - INTERVAL '90 days'
        UNION ALL
        SELECT 'escalation_resolved', resolved_at,
          'Escalation resolved',
          customer_id, NULL
        FROM escalations WHERE business_id = $1 AND resolved_at IS NOT NULL AND resolved_at > NOW() - INTERVAL '90 days'
        UNION ALL
        SELECT 'staff_invited', created_at,
          'Staff invited: ' || COALESCE(full_name, 'Unknown'),
          NULL, NULL
        FROM staff_profiles WHERE business_id = $1 AND created_at > NOW() - INTERVAL '90 days'
      ) AS activity
      ORDER BY occurred_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [businessId, limit]);
    return result.rows;
  }
}

export const operationalController = new OperationalController();
