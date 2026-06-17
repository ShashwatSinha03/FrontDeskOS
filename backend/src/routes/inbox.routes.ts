import { Router } from 'express';
import { authenticate, loadMembership, requireStaff, requireBusinessAccess } from '../middleware';
import { inboxController } from '../controllers/inbox.controller';

const router = Router();
router.use(authenticate);
router.use(loadMembership);
router.use(requireStaff());
router.use(requireBusinessAccess());

router.get('/inbox/conversations', (req, res) => inboxController.getInboxConversations(req, res));
router.get('/inbox/counts', (req, res) => inboxController.getInboxCounts(req, res));
router.post('/inbox/conversations/:conversationId/join', (req, res) => inboxController.joinConversation(req, res));
router.post('/inbox/conversations/:conversationId/return-to-ai', (req, res) => inboxController.returnToAI(req, res));
router.post('/inbox/conversations/:conversationId/message', (req, res) => inboxController.sendOwnerMessage(req, res));

export { router as inboxRouter };
