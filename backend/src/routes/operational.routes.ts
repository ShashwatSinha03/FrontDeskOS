import { Router } from 'express';
import { authenticate, loadMembership } from '../middleware';
import { operationalController } from '../controllers/operational.controller';

const router = Router();
router.use(authenticate);
router.use(loadMembership);

router.get('/operate/dashboard', (req, res) => operationalController.getDashboard(req, res));
router.get('/operate/leads', (req, res) => operationalController.getLeads(req, res));
router.patch('/operate/leads/:id/lifecycle', (req, res) => operationalController.updateLeadLifecycle(req, res));
router.get('/operate/appointments', (req, res) => operationalController.getAppointments(req, res));
router.patch('/operate/appointments/:id/status', (req, res) => operationalController.updateAppointmentStatus(req, res));
router.patch('/operate/appointments/:id/reschedule', (req, res) => operationalController.rescheduleAppointment(req, res));
router.get('/operate/escalations', (req, res) => operationalController.getEscalations(req, res));
router.post('/operate/escalations/:id/resolve', (req, res) => operationalController.resolveEscalation(req, res));

export { router as operationalRouter };
