import { Router } from 'express';
import { authenticate, loadMembership, requireStaff, requireBusinessAccess } from '../middleware';
import { operationalController } from '../controllers/operational.controller';

const router = Router();
router.use(authenticate);
router.use(loadMembership);
router.use(requireStaff());
router.use(requireBusinessAccess());

router.get('/operate/dashboard', (req, res) => operationalController.getDashboard(req, res));
router.get('/operate/leads', (req, res) => operationalController.getLeads(req, res));
router.patch('/operate/leads/:id/lifecycle', (req, res) => operationalController.updateLeadLifecycle(req, res));
router.get('/operate/appointments', (req, res) => operationalController.getAppointments(req, res));
router.patch('/operate/appointments/:id/status', (req, res) => operationalController.updateAppointmentStatus(req, res));
router.patch('/operate/appointments/:id/reschedule', (req, res) => operationalController.rescheduleAppointment(req, res));
router.get('/operate/escalations', (req, res) => operationalController.getEscalations(req, res));
router.post('/operate/escalations/:id/resolve', (req, res) => operationalController.resolveEscalation(req, res));

router.get('/operate/conversations', (req, res) => operationalController.getConversations(req, res));
router.get('/operate/conversations/:id', (req, res) => operationalController.getConversationDetail(req, res));
router.get('/operate/deliveries/health', (req, res) => operationalController.getDeliveryHealth(req, res));
router.get('/operate/deliveries/failed', (req, res) => operationalController.getFailedDeliveries(req, res));
router.get('/operate/activity', (req, res) => operationalController.getActivity(req, res));

export { router as operationalRouter };
