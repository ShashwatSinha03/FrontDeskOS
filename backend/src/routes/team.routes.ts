import { Router } from 'express';
import { authenticate, loadMembership, requireOwner, requireBusinessAccess } from '../middleware';
import { teamController } from '../controllers/team.controller';

const teamRouter = Router();

teamRouter.get('/team', authenticate, loadMembership, requireBusinessAccess(), (req, res) => teamController.list(req, res));

teamRouter.post('/team/invite', authenticate, loadMembership, requireBusinessAccess(), requireOwner(), (req, res) => teamController.invite(req, res));
teamRouter.patch('/team/:id/status', authenticate, loadMembership, requireBusinessAccess(), requireOwner(), (req, res) => teamController.updateStatus(req, res));
teamRouter.delete('/team/:id', authenticate, loadMembership, requireBusinessAccess(), requireOwner(), (req, res) => teamController.remove(req, res));
teamRouter.post('/team/:id/promote', authenticate, loadMembership, requireBusinessAccess(), requireOwner(), (req, res) => teamController.promote(req, res));

export { teamRouter };
