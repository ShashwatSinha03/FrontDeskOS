import { Router, Request, Response } from 'express';
import { founderController } from '../controllers/founder.controller';

const founderRouter = Router();

// Overview
founderRouter.get('/overview', (req: Request, res: Response) => founderController.getOverview(req, res));

// Businesses
founderRouter.get('/businesses', (req: Request, res: Response) => founderController.listBusinesses(req, res));
founderRouter.get('/businesses/:id', (req: Request, res: Response) => founderController.getBusiness(req, res));

// Leads (cross-business)
founderRouter.get('/leads', (req: Request, res: Response) => founderController.listLeads(req, res));

// Appointments (cross-business)
founderRouter.get('/appointments', (req: Request, res: Response) => founderController.listAppointments(req, res));

// Escalations (cross-business)
founderRouter.get('/escalations', (req: Request, res: Response) => founderController.listEscalations(req, res));

// Subscriptions
founderRouter.get('/subscriptions', (req: Request, res: Response) => founderController.listSubscriptions(req, res));
founderRouter.post('/subscriptions', (req: Request, res: Response) => founderController.createSubscription(req, res));
founderRouter.patch('/subscriptions/:id', (req: Request, res: Response) => founderController.updateSubscription(req, res));

// Activity feed
founderRouter.get('/activity', (req: Request, res: Response) => founderController.listActivity(req, res));

export { founderRouter };
