import { Router } from 'express';
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
router.post('/chat', resolveSession, (req, res) => chatController.handleMessage(req, res));
router.get('/conversations/:id/messages', (req, res) => conversationController.getMessages(req, res));

// ==========================================
// 2. Lead & Business Dashboard Router
// ==========================================
router.get('/dashboard/summary', (req, res) => dashboardController.getSummary(req, res));
router.get('/leads', (req, res) => dashboardController.getLeads(req, res));
router.get('/escalations', (req, res) => dashboardController.getEscalations(req, res));
router.post('/escalations/:id/resolve', (req, res) => dashboardController.resolveEscalation(req, res));

// ==========================================
// 3. Learning Inbox & Knowledge Base Router
// ==========================================
router.get('/knowledge-base/requests', (req, res) => dashboardController.getKnowledgeRequests(req, res));
router.post('/knowledge-base/requests/:id/approve', (req, res) => dashboardController.approveKnowledgeRequest(req, res));
router.post('/knowledge-base/requests/:id/reject', (req, res) => dashboardController.rejectKnowledgeRequest(req, res));

// ==========================================
// 4. Appointment Booking Engine
// ==========================================
router.get('/appointments', (req, res) => appointmentController.list(req, res));
router.get('/appointments/slots', (req, res) => appointmentController.getSlots(req, res));
router.post('/appointments/book', (req, res) => appointmentController.book(req, res));
router.post('/appointments/:id/cancel', (req, res) => appointmentController.cancel(req, res));
router.post('/appointments/:id/reschedule', (req, res) => appointmentController.reschedule(req, res));
router.post('/appointments/:id/confirm', (req, res) => appointmentController.confirm(req, res));
router.post('/appointments/:id/complete', (req, res) => appointmentController.complete(req, res));

// ==========================================
// 5. Availability Management
// ==========================================
router.get('/availability/schedules', (req, res) => availabilityController.listSchedules(req, res));
router.post('/availability/schedules', (req, res) => availabilityController.createSchedule(req, res));
router.delete('/availability/schedules/:id', (req, res) => availabilityController.deleteSchedule(req, res));
router.get('/availability/overrides', (req, res) => availabilityController.listOverrides(req, res));
router.post('/availability/overrides', (req, res) => availabilityController.createOverride(req, res));
router.delete('/availability/overrides/:id', (req, res) => availabilityController.deleteOverride(req, res));

// ==========================================
// 6. Follow-Up Engine Dashboard & Trigger
// ==========================================
router.get('/follow-ups', (req, res) => followUpController.list(req, res));
router.post('/follow-ups/:id/cancel', (req, res) => followUpController.cancel(req, res));
router.post('/cron/follow-ups', (req, res) => cronController.triggerFollowUps(req, res));

// ==========================================
// 7. Recovery Engine Configuration
// ==========================================
router.get('/recovery/config', (req, res) => recoveryController.getConfig(req, res));
router.put('/recovery/config', (req, res) => recoveryController.updateConfig(req, res));

// ==========================================
// 8. Public / Customer-Facing Endpoints
// ==========================================
router.get('/public/businesses/:slug', (req, res) => publicController.getBusiness(req, res));
router.get('/public/businesses/:slug/services', (req, res) => publicController.getServices(req, res));
router.post('/public/businesses/:slug/contact', (req, res) => publicController.submitContact(req, res));
router.post('/public/sessions/create', (req, res) => publicController.createSession(req, res));

export default router;
export { router };
