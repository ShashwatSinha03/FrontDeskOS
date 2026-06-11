import { Router } from 'express';
import { settingsController } from '../../controllers/settings.controller';

const settingsRouter = Router();

// Business profile
settingsRouter.get('/business', (req, res) => settingsController.getBusiness(req, res));
settingsRouter.patch('/business', (req, res) => settingsController.updateBusiness(req, res));

// Services
settingsRouter.get('/services', (req, res) => settingsController.listServices(req, res));
settingsRouter.post('/services', (req, res) => settingsController.createService(req, res));
settingsRouter.patch('/services/:id', (req, res) => settingsController.updateService(req, res));
settingsRouter.delete('/services/:id', (req, res) => settingsController.deleteService(req, res));

// Hours
settingsRouter.get('/hours', (req, res) => settingsController.getHours(req, res));
settingsRouter.patch('/hours', (req, res) => settingsController.updateHours(req, res));

// FAQs
settingsRouter.get('/faqs', (req, res) => settingsController.getFaqs(req, res));
settingsRouter.patch('/faqs', (req, res) => settingsController.updateFaqs(req, res));

// AI Receptionist
settingsRouter.get('/ai', (req, res) => settingsController.getAiSettings(req, res));
settingsRouter.patch('/ai', (req, res) => settingsController.updateAiSettings(req, res));

// Billing
settingsRouter.get('/billing', (req, res) => settingsController.getBilling(req, res));

// AI Preview (read-only)
settingsRouter.post('/preview-chat', (req, res) => settingsController.previewChat(req, res));

export { settingsRouter };
