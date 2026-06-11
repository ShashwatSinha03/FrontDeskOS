import { Router } from 'express';
import { authenticate, loadMembership } from '../middleware';
import { analyticsController } from '../controllers/analytics.controller';

const router = Router();
router.use(authenticate);
router.use(loadMembership);

router.get('/analytics/overview', (req, res) => analyticsController.overview(req, res));
router.get('/analytics/services', (req, res) => analyticsController.services(req, res));
router.get('/analytics/trends', (req, res) => analyticsController.trends(req, res));
router.get('/analytics/funnel', (req, res) => analyticsController.funnel(req, res));

export { router as analyticsRouter };
