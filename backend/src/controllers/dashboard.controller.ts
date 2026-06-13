import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/db';
import { 
  customerRepository, 
  escalationRepository, 
  knowledgeRequestRepository,
  businessRepository
} from '../repositories';
import { logger } from '../lib/logger';
import { CustomerLifecycleState, EscalationStatus, KnowledgeRequestStatus } from '../types';

const uuidParam = z.string().uuid('Invalid UUID parameter');

// Pagination and search schema helper (businessId comes from auth membership)
const queryFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class DashboardController {
  /**
   * Get aggregated statistics and KPIs for the business dashboard.
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;

      // 1. Fetch lead counts grouped by lifecycle state
      const leadStateQuery = `
        SELECT lifecycle_state, COUNT(*) as count
        FROM customers
        WHERE business_id = $1
        GROUP BY lifecycle_state
      `;
      const leadStatesRes = await pool.query(leadStateQuery, [businessId]);

      // 2. Fetch pending escalations count
      const escalationsQuery = `
        SELECT COUNT(*) as count
        FROM escalations
        WHERE business_id = $1 AND status = 'pending'
      `;
      const escalationsCountRes = await pool.query(escalationsQuery, [businessId]);
      const pendingEscalations = parseInt(escalationsCountRes.rows[0].count, 10);

      // 3. Fetch pending unknown questions count (Learning Inbox)
      const knowledgeQuery = `
        SELECT COUNT(*) as count
        FROM knowledge_requests
        WHERE business_id = $1 AND status = 'pending'
      `;
      const knowledgeCountRes = await pool.query(knowledgeQuery, [businessId]);
      const pendingKnowledgeRequests = parseInt(knowledgeCountRes.rows[0].count, 10);

      // 4. Fetch upcoming active appointments scheduled for today
      const appointmentsTodayQuery = `
        SELECT COUNT(*) as count
        FROM appointments
        WHERE business_id = $1 
          AND appointment_time >= CURRENT_DATE 
          AND appointment_time < CURRENT_DATE + INTERVAL '1 day'
          AND status IN ('pending', 'confirmed')
      `;
      const appointmentsTodayRes = await pool.query(appointmentsTodayQuery, [businessId]);
      const appointmentsToday = parseInt(appointmentsTodayRes.rows[0].count, 10);

      // Setup default breakdowns
      const leadStateBreakdown: Record<CustomerLifecycleState, number> = {
        'New Inquiry': 0,
        'Information Gathering': 0,
        'Qualified': 0,
        'Booking Opportunity': 0,
        'Booked': 0,
        'Customer': 0,
        'Follow-Up Pending': 0,
        'Escalated': 0,
        'Lost': 0
      };

      let totalLeads = 0;
      leadStatesRes.rows.forEach((row: any) => {
        const count = parseInt(row.count, 10);
        const state = row.lifecycle_state as CustomerLifecycleState;
        if (state in leadStateBreakdown) {
          leadStateBreakdown[state] = count;
          totalLeads += count;
        }
      });

      // Calculate conversion rate: (Booked + Customer) / Total Leads
      const bookedCount = leadStateBreakdown['Booked'] + leadStateBreakdown['Customer'];
      const conversionRate = totalLeads > 0 ? Math.round((bookedCount / totalLeads) * 100) : 0;

      res.status(200).json({
        success: true,
        data: {
          leadStateBreakdown,
          totalLeads,
          pendingEscalations,
          pendingKnowledgeRequests,
          appointmentsToday,
          conversionRate,
        }
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('❌ Error compiling summary', { route: 'Dashboard', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get paginated customer leads for the dashboard, with state filters and keyword search.
   */
  async getLeads(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;
      const parsedQuery = queryFilterSchema.extend({
        state: z.string().optional(),
        search: z.string().optional(),
      }).parse(req.query);

      const lifecycleState = parsedQuery.state as CustomerLifecycleState | undefined;

      const { customers, totalCount } = await customerRepository.findAllByBusiness(
        businessId,
        { lifecycleState, search: parsedQuery.search },
        { page: parsedQuery.page, limit: parsedQuery.limit }
      );

      const totalPages = Math.ceil(totalCount / parsedQuery.limit);

      res.status(200).json({
        success: true,
        data: customers,
        meta: {
          totalCount,
          totalPages,
          currentPage: parsedQuery.page,
          limit: parsedQuery.limit,
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

  /**
   * Get paginated human-takeover escalations, with filter by resolution status.
   */
  async getEscalations(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;
      const parsedQuery = queryFilterSchema.extend({
        status: z.enum(['pending', 'resolved']).default('pending'),
      }).parse(req.query);

      const { escalations, totalCount } = await escalationRepository.findByBusiness(
        businessId,
        { status: parsedQuery.status as EscalationStatus },
        { page: parsedQuery.page, limit: parsedQuery.limit }
      );

      const totalPages = Math.ceil(totalCount / parsedQuery.limit);

      res.status(200).json({
        success: true,
        data: escalations,
        meta: {
          totalCount,
          totalPages,
          currentPage: parsedQuery.page,
          limit: parsedQuery.limit,
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

  /**
   * Resolve an escalation.
   */
  async resolveEscalation(req: Request, res: Response): Promise<void> {
    try {
      const id = uuidParam.parse(req.params.id);
      const businessId = req.membership!.businessId;
      await escalationRepository.resolve(id, businessId);
      res.status(200).json({ success: true, message: 'Escalation marked as resolved.' });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get paginated unknown knowledge requests (Learning Inbox) with filter by status.
   */
  async getKnowledgeRequests(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;
      const parsedQuery = queryFilterSchema.extend({
        status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
      }).parse(req.query);

      const { requests, totalCount } = await knowledgeRequestRepository.findByBusiness(
        businessId,
        { status: parsedQuery.status as KnowledgeRequestStatus },
        { page: parsedQuery.page, limit: parsedQuery.limit }
      );

      const totalPages = Math.ceil(totalCount / parsedQuery.limit);

      res.status(200).json({
        success: true,
        data: requests,
        meta: {
          totalCount,
          totalPages,
          currentPage: parsedQuery.page,
          limit: parsedQuery.limit,
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

  /**
   * Approve a knowledge request, adding the Q&A to the business's FAQ array.
   */
  async approveKnowledgeRequest(req: Request, res: Response): Promise<void> {
    try {
      const id = uuidParam.parse(req.params.id);
      const businessId = req.membership!.businessId;
      const schema = z.object({
        answer: z.string().min(1, 'Approved answer is required'),
      });

      const { answer } = schema.parse(req.body);

      // 1. Mark request as approved
      const request = await knowledgeRequestRepository.updateStatus(id, 'approved', businessId, answer);

      // 2. Fetch business profile
      const business = await businessRepository.findById(request.businessId);
      if (!business) {
        res.status(404).json({ success: false, error: 'Associated business not found.' });
        return;
      }

      // 3. Check for duplicate before appending to FAQs
      const isDuplicate = business.faqs.some(
        f => f.question.toLowerCase().trim() === request.unansweredQuestion.toLowerCase().trim()
      );
      if (isDuplicate) {
        res.status(409).json({ success: false, error: 'This question already exists in the FAQ list.' });
        return;
      }

      const updatedFaqs = [
        ...business.faqs,
        { question: request.unansweredQuestion, answer: answer }
      ];

      await businessRepository.updateFaqs(request.businessId, updatedFaqs);

      res.status(200).json({
        success: true,
        message: 'Knowledge request approved and FAQ successfully added to the knowledge base.',
        data: request
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Reject a knowledge request, removing it from Learning Inbox review queue.
   */
  async rejectKnowledgeRequest(req: Request, res: Response): Promise<void> {
    try {
      const id = uuidParam.parse(req.params.id);
      const businessId = req.membership!.businessId;
      const request = await knowledgeRequestRepository.updateStatus(id, 'rejected', businessId);
      res.status(200).json({ success: true, message: 'Knowledge request rejected.', data: request });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const dashboardController = new DashboardController();
export default dashboardController;
