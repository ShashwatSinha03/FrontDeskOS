import { Router } from 'express';
import { authenticate, loadMembership, requireOwner } from '../middleware';
import { settingsController } from '../controllers/settings.controller';

const readRouter = Router();
readRouter.use(authenticate);
readRouter.use(loadMembership);

readRouter.get('/settings/business', (req, res) => settingsController.getBusiness(req, res));
readRouter.get('/settings/services', (req, res) => settingsController.getServices(req, res));
readRouter.get('/settings/hours', (req, res) => settingsController.getHours(req, res));
readRouter.get('/settings/faqs', (req, res) => settingsController.getFaqs(req, res));
readRouter.get('/settings/ai', (req, res) => settingsController.getAi(req, res));

const writeRouter = Router();
writeRouter.use(authenticate);
writeRouter.use(loadMembership);
writeRouter.use(requireOwner());

writeRouter.patch('/settings/business', (req, res) => settingsController.updateBusiness(req, res));
writeRouter.post('/settings/services', (req, res) => settingsController.createService(req, res));
writeRouter.patch('/settings/services/:id', (req, res) => settingsController.updateService(req, res));
writeRouter.patch('/settings/services/:id/toggle', (req, res) => settingsController.toggleService(req, res));
writeRouter.put('/settings/hours', (req, res) => settingsController.updateHours(req, res));
writeRouter.put('/settings/faqs', (req, res) => settingsController.updateFaqs(req, res));
writeRouter.patch('/settings/ai', (req, res) => settingsController.updateAi(req, res));

const settingsRouter = Router();
settingsRouter.use(readRouter);
settingsRouter.use(writeRouter);

export { settingsRouter };
