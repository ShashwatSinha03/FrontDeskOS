import { Router, Request, Response } from 'express';
import { requireApiKey } from '../middleware/auth';
import { authenticate, loadMembership, requireStaff } from '../middleware';
import { resolveSession } from '../middleware/session';
import { chatLimiter } from '../middleware/rate-limit';
import { chatController } from '../controllers/chat.controller';
import { conversationController } from '../controllers/conversation.controller';
import { dashboardController } from '../controllers/dashboard.controller';
import { appointmentController } from '../controllers/appointment.controller';
import { availabilityController } from '../controllers/availability.controller';
import { followUpController } from '../controllers/followup.controller';
import { recoveryController } from '../controllers/recovery.controller';
import { cronController } from '../controllers/cron.controller';
import { publicController } from '../controllers/public.controller';
import { ownerController } from '../controllers/owner.controller';
import { onboardingRouter } from './onboarding.routes';

// ==========================================
// Public Router — no authentication required
// ==========================================
const publicRouter = Router();

publicRouter.post('/chat', chatLimiter, resolveSession, (req: Request, res: Response) => chatController.handleMessage(req, res));

publicRouter.get('/public/businesses/:slug', (req: Request, res: Response) => publicController.getBusiness(req, res));
publicRouter.get('/public/businesses/:slug/services', (req: Request, res: Response) => publicController.getServices(req, res));
publicRouter.post('/public/businesses/:slug/contact', (req: Request, res: Response) => publicController.submitContact(req, res));
publicRouter.post('/public/sessions/create', (req: Request, res: Response) => publicController.createSession(req, res));
publicRouter.get('/appointments/slots', (req: Request, res: Response) => appointmentController.getSlots(req, res));
publicRouter.post('/appointments/book', (req: Request, res: Response) => appointmentController.book(req, res));

// ==========================================
// Admin Router — requires x-api-key
// Some routes additionally require user auth + staff membership
// ==========================================
const adminRouter = Router();

adminRouter.use(requireApiKey);

const adminAuth = [authenticate, loadMembership, requireStaff()];

// Auth-protected admin work routes (require user session + staff membership)
adminRouter.get('/conversations/:id/messages', ...adminAuth, (req: Request, res: Response) => conversationController.getMessages(req, res));

adminRouter.get('/dashboard/summary', ...adminAuth, (req: Request, res: Response) => dashboardController.getSummary(req, res));
adminRouter.get('/leads', ...adminAuth, (req: Request, res: Response) => dashboardController.getLeads(req, res));
adminRouter.get('/leads/:id', ...adminAuth, (req: Request, res: Response) => ownerController.getCustomerDetail(req, res));
adminRouter.put('/leads/:id/lifecycle', ...adminAuth, (req: Request, res: Response) => ownerController.updateLifecycle(req, res));
adminRouter.get('/leads/:id/conversations', ...adminAuth, (req: Request, res: Response) => ownerController.getCustomerConversations(req, res));
adminRouter.post('/leads', ...adminAuth, (req: Request, res: Response) => ownerController.createLead(req, res));
adminRouter.put('/leads/:id/profile', ...adminAuth, (req: Request, res: Response) => ownerController.updateCustomerProfile(req, res));
adminRouter.get('/escalations', ...adminAuth, (req: Request, res: Response) => dashboardController.getEscalations(req, res));
adminRouter.post('/escalations/:id/resolve', ...adminAuth, (req: Request, res: Response) => dashboardController.resolveEscalation(req, res));

adminRouter.get('/knowledge-base/requests', ...adminAuth, (req: Request, res: Response) => dashboardController.getKnowledgeRequests(req, res));
adminRouter.post('/knowledge-base/requests/:id/approve', ...adminAuth, (req: Request, res: Response) => dashboardController.approveKnowledgeRequest(req, res));
adminRouter.post('/knowledge-base/requests/:id/reject', ...adminAuth, (req: Request, res: Response) => dashboardController.rejectKnowledgeRequest(req, res));

adminRouter.get('/appointments', ...adminAuth, (req: Request, res: Response) => appointmentController.list(req, res));
adminRouter.post('/appointments/book', ...adminAuth, (req: Request, res: Response) => appointmentController.book(req, res));

adminRouter.post('/appointments/:id/cancel', ...adminAuth, (req: Request, res: Response) => appointmentController.cancel(req, res));
adminRouter.post('/appointments/:id/reschedule', ...adminAuth, (req: Request, res: Response) => appointmentController.reschedule(req, res));
adminRouter.post('/appointments/:id/confirm', ...adminAuth, (req: Request, res: Response) => appointmentController.confirm(req, res));
adminRouter.post('/appointments/:id/complete', ...adminAuth, (req: Request, res: Response) => appointmentController.complete(req, res));

adminRouter.get('/availability/schedules', ...adminAuth, (req: Request, res: Response) => availabilityController.listSchedules(req, res));
adminRouter.post('/availability/schedules', ...adminAuth, (req: Request, res: Response) => availabilityController.createSchedule(req, res));
adminRouter.delete('/availability/schedules/:id', ...adminAuth, (req: Request, res: Response) => availabilityController.deleteSchedule(req, res));
adminRouter.get('/availability/overrides', ...adminAuth, (req: Request, res: Response) => availabilityController.listOverrides(req, res));
adminRouter.post('/availability/overrides', ...adminAuth, (req: Request, res: Response) => availabilityController.createOverride(req, res));
adminRouter.delete('/availability/overrides/:id', ...adminAuth, (req: Request, res: Response) => availabilityController.deleteOverride(req, res));

adminRouter.get('/follow-ups', ...adminAuth, (req: Request, res: Response) => followUpController.list(req, res));
adminRouter.post('/follow-ups/:id/cancel', ...adminAuth, (req: Request, res: Response) => followUpController.cancel(req, res));

adminRouter.get('/recovery/config', ...adminAuth, (req: Request, res: Response) => recoveryController.getConfig(req, res));
adminRouter.put('/recovery/config', ...adminAuth, (req: Request, res: Response) => recoveryController.updateConfig(req, res));

// System-only routes (API key only, no user session required — e.g., cron jobs)
adminRouter.post('/cron/follow-ups', (req: Request, res: Response) => cronController.triggerFollowUps(req, res));

// Onboarding wizard routes (have their own authenticate + requireSuperAdmin)
adminRouter.use(onboardingRouter);

export { publicRouter, adminRouter };
