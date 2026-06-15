import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware';
import { founderController } from '../controllers/founder.controller';

const founderRouter = Router();

founderRouter.use(authenticate);
founderRouter.use(requireSuperAdmin);

founderRouter.get('/overview', (req, res) => founderController.getOverview(req, res));

founderRouter.get('/businesses', (req, res) => founderController.getBusinesses(req, res));
founderRouter.get('/businesses/:id', (req, res) => founderController.getBusiness(req, res));
founderRouter.patch('/businesses/:id', (req, res) => founderController.updateBusiness(req, res));
founderRouter.post('/businesses/:id/assign-owner', (req, res) => founderController.assignOwner(req, res));
founderRouter.patch('/businesses/:id/status', (req, res) => founderController.updateBusinessStatus(req, res));

founderRouter.get('/users', (req, res) => founderController.getUsers(req, res));
founderRouter.get('/users/:id', (req, res) => founderController.getUser(req, res));
founderRouter.patch('/users/:id/status', (req, res) => founderController.updateUserStatus(req, res));
founderRouter.post('/users/:id/reset-password', (req, res) => founderController.resetUserPassword(req, res));
founderRouter.post('/users/:id/transfer-ownership', (req, res) => founderController.transferOwnership(req, res));
founderRouter.delete('/users/:id/membership', (req, res) => founderController.removeMembership(req, res));

founderRouter.get('/pilot/health', (req, res) => founderController.getPilotHealth(req, res));
founderRouter.get('/support/search', (req, res) => founderController.supportSearch(req, res));
founderRouter.get('/businesses/:id/health', (req, res) => founderController.getBusinessHealth(req, res));

founderRouter.get('/onboarding', (req, res) => founderController.getOnboarding(req, res));

export { founderRouter };
