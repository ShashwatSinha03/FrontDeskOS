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

const router = Router();

router.use(requireApiKey);

// ==========================================
// 1. Chat Widget Router
// ==========================================
router.post('/chat', resolveSession, (req: Request, res: Response) => chatController.handleMessage(req, res));
router.get('/conversations/:id/messages', (req: Request, res: Response) => conversationController.getMessages(req, res));

// ==========================================
// 2. Lead & Business Dashboard Router
// ==========================================
router.get('/dashboard/summary', (req: Request, res: Response) => dashboardController.getSummary(req, res));
router.get('/leads', (req: Request, res: Response) => dashboardController.getLeads(req, res));
router.get('/escalations', (req: Request, res: Response) => dashboardController.getEscalations(req, res));
router.post('/escalations/:id/resolve', (req: Request, res: Response) => dashboardController.resolveEscalation(req, res));

// ==========================================
// 3. Learning Inbox & Knowledge Base Router
// ==========================================
router.get('/knowledge-base/requests', (req: Request, res: Response) => dashboardController.getKnowledgeRequests(req, res));
router.post('/knowledge-base/requests/:id/approve', (req: Request, res: Response) => dashboardController.approveKnowledgeRequest(req, res));
router.post('/knowledge-base/requests/:id/reject', (req: Request, res: Response) => dashboardController.rejectKnowledgeRequest(req, res));

// ==========================================
// 4. Appointment Booking Engine
// ==========================================
router.get('/appointments', (req: Request, res: Response) => appointmentController.list(req, res));
router.get('/appointments/slots', (req: Request, res: Response) => appointmentController.getSlots(req, res));
router.post('/appointments/book', (req: Request, res: Response) => appointmentController.book(req, res));
router.post('/appointments/:id/cancel', (req: Request, res: Response) => appointmentController.cancel(req, res));
router.post('/appointments/:id/reschedule', (req: Request, res: Response) => appointmentController.reschedule(req, res));
router.post('/appointments/:id/confirm', (req: Request, res: Response) => appointmentController.confirm(req, res));
router.post('/appointments/:id/complete', (req: Request, res: Response) => appointmentController.complete(req, res));

// ==========================================
// 5. Availability Management
// ==========================================
router.get('/availability/schedules', (req: Request, res: Response) => availabilityController.listSchedules(req, res));
router.post('/availability/schedules', (req: Request, res: Response) => availabilityController.createSchedule(req, res));
router.delete('/availability/schedules/:id', (req: Request, res: Response) => availabilityController.deleteSchedule(req, res));
router.get('/availability/overrides', (req: Request, res: Response) => availabilityController.listOverrides(req, res));
router.post('/availability/overrides', (req: Request, res: Response) => availabilityController.createOverride(req, res));
router.delete('/availability/overrides/:id', (req: Request, res: Response) => availabilityController.deleteOverride(req, res));

// ==========================================
// 6. Follow-Up Engine Dashboard & Trigger
// ==========================================
router.get('/follow-ups', (req: Request, res: Response) => followUpController.list(req, res));
router.post('/follow-ups/:id/cancel', (req: Request, res: Response) => followUpController.cancel(req, res));
router.post('/cron/follow-ups', (req: Request, res: Response) => cronController.triggerFollowUps(req, res));

// ==========================================
// 7. Recovery Engine Configuration
// ==========================================
router.get('/recovery/config', (req: Request, res: Response) => recoveryController.getConfig(req, res));
router.put('/recovery/config', (req: Request, res: Response) => recoveryController.updateConfig(req, res));

// ==========================================
// 8. Public / Customer-Facing Endpoints
// ==========================================
router.get('/public/businesses/:slug', (req: Request, res: Response) => publicController.getBusiness(req, res));
router.get('/public/businesses/:slug/services', (req: Request, res: Response) => publicController.getServices(req, res));
router.post('/public/businesses/:slug/contact', (req: Request, res: Response) => publicController.submitContact(req, res));
router.post('/public/sessions/create', (req: Request, res: Response) => publicController.createSession(req, res));

export default router;
export { router };
