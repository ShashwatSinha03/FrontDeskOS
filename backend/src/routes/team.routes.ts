import { Router } from 'express';
import { authenticate, loadMembership, requireOwner } from '../middleware';
import { teamController } from '../controllers/team.controller';

const teamRouter = Router();

teamRouter.get('/team', authenticate, loadMembership, (req, res) => teamController.list(req, res));

teamRouter.post('/team/invite', authenticate, loadMembership, requireOwner(), (req, res) => teamController.invite(req, res));
teamRouter.patch('/team/:id/status', authenticate, loadMembership, requireOwner(), (req, res) => teamController.updateStatus(req, res));
teamRouter.delete('/team/:id', authenticate, loadMembership, requireOwner(), (req, res) => teamController.remove(req, res));
teamRouter.post('/team/:id/promote', authenticate, loadMembership, requireOwner(), (req, res) => teamController.promote(req, res));

export { teamRouter };
