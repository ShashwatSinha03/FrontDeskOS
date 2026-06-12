import { Router } from 'express';
import { authenticate, loadMembership, requireStaff } from '../middleware';
import { notificationController } from '../controllers/notification.controller';

const router = Router();
router.use(authenticate);
router.use(loadMembership);
router.use(requireStaff());

router.get('/notifications', (req, res) => notificationController.list(req, res));
router.patch('/notifications/:id/read', (req, res) => notificationController.markRead(req, res));
router.patch('/notifications/read-all', (req, res) => notificationController.markAllRead(req, res));
router.get('/notifications/unread-count', (req, res) => notificationController.unreadCount(req, res));

export { router as notificationRouter };
