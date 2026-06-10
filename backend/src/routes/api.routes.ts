import { Router, Request, Response } from 'express';
import { requireApiKey } from '../middleware/auth';
import { resolveSession } from '../middleware/session';
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

// ==========================================
// Public Router — no authentication required
// ==========================================
const publicRouter = Router();

publicRouter.post('/chat', resolveSession, (req: Request, res: Response) => chatController.handleMessage(req, res));
publicRouter.get('/conversations/:id/messages', (req: Request, res: Response) => conversationController.getMessages(req, res));

publicRouter.get('/public/businesses/:slug', (req: Request, res: Response) => publicController.getBusiness(req, res));
publicRouter.get('/public/businesses/:slug/services', (req: Request, res: Response) => publicController.getServices(req, res));
publicRouter.post('/public/businesses/:slug/contact', (req: Request, res: Response) => publicController.submitContact(req, res));
publicRouter.post('/public/sessions/create', (req: Request, res: Response) => publicController.createSession(req, res));
publicRouter.get('/appointments/slots', (req: Request, res: Response) => appointmentController.getSlots(req, res));
publicRouter.post('/appointments/book', (req: Request, res: Response) => appointmentController.book(req, res));

// ==========================================
// Admin Router — requires x-api-key
// ==========================================
const adminRouter = Router();

adminRouter.use(requireApiKey);

adminRouter.get('/dashboard/summary', (req: Request, res: Response) => dashboardController.getSummary(req, res));
adminRouter.get('/leads', (req: Request, res: Response) => dashboardController.getLeads(req, res));
adminRouter.get('/leads/:id', (req: Request, res: Response) => ownerController.getCustomerDetail(req, res));
adminRouter.put('/leads/:id/lifecycle', (req: Request, res: Response) => ownerController.updateLifecycle(req, res));
adminRouter.get('/leads/:id/conversations', (req: Request, res: Response) => ownerController.getCustomerConversations(req, res));
adminRouter.post('/leads', (req: Request, res: Response) => ownerController.createLead(req, res));
adminRouter.put('/leads/:id/profile', (req: Request, res: Response) => ownerController.updateCustomerProfile(req, res));
adminRouter.get('/escalations', (req: Request, res: Response) => dashboardController.getEscalations(req, res));
adminRouter.post('/escalations/:id/resolve', (req: Request, res: Response) => dashboardController.resolveEscalation(req, res));

adminRouter.get('/knowledge-base/requests', (req: Request, res: Response) => dashboardController.getKnowledgeRequests(req, res));
adminRouter.post('/knowledge-base/requests/:id/approve', (req: Request, res: Response) => dashboardController.approveKnowledgeRequest(req, res));
adminRouter.post('/knowledge-base/requests/:id/reject', (req: Request, res: Response) => dashboardController.rejectKnowledgeRequest(req, res));

adminRouter.get('/appointments', (req: Request, res: Response) => appointmentController.list(req, res));
adminRouter.post('/appointments/book', (req: Request, res: Response) => appointmentController.book(req, res));

adminRouter.post('/appointments/:id/cancel', (req: Request, res: Response) => appointmentController.cancel(req, res));
adminRouter.post('/appointments/:id/reschedule', (req: Request, res: Response) => appointmentController.reschedule(req, res));
adminRouter.post('/appointments/:id/confirm', (req: Request, res: Response) => appointmentController.confirm(req, res));
adminRouter.post('/appointments/:id/complete', (req: Request, res: Response) => appointmentController.complete(req, res));

adminRouter.get('/availability/schedules', (req: Request, res: Response) => availabilityController.listSchedules(req, res));
adminRouter.post('/availability/schedules', (req: Request, res: Response) => availabilityController.createSchedule(req, res));
adminRouter.delete('/availability/schedules/:id', (req: Request, res: Response) => availabilityController.deleteSchedule(req, res));
adminRouter.get('/availability/overrides', (req: Request, res: Response) => availabilityController.listOverrides(req, res));
adminRouter.post('/availability/overrides', (req: Request, res: Response) => availabilityController.createOverride(req, res));
adminRouter.delete('/availability/overrides/:id', (req: Request, res: Response) => availabilityController.deleteOverride(req, res));

adminRouter.get('/follow-ups', (req: Request, res: Response) => followUpController.list(req, res));
adminRouter.post('/follow-ups/:id/cancel', (req: Request, res: Response) => followUpController.cancel(req, res));
adminRouter.post('/cron/follow-ups', (req: Request, res: Response) => cronController.triggerFollowUps(req, res));

adminRouter.get('/recovery/config', (req: Request, res: Response) => recoveryController.getConfig(req, res));
adminRouter.put('/recovery/config', (req: Request, res: Response) => recoveryController.updateConfig(req, res));

export { publicRouter, adminRouter };
