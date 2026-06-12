import { Router, Request, Response } from 'express';
import { onboardingController } from '../controllers/onboarding.controller';
import { authenticate } from '../middleware/authenticate';
import { requireSuperAdmin } from '../middleware/require-super-admin';

const onboardingRouter = Router();

onboardingRouter.get('/onboarding/templates/:industry', (req: Request, res: Response) => onboardingController.getTemplates(req, res));
onboardingRouter.post('/onboarding/publish', authenticate, requireSuperAdmin, (req: Request, res: Response) => onboardingController.publish(req, res));
onboardingRouter.post('/onboarding/owner', authenticate, requireSuperAdmin, (req: Request, res: Response) => onboardingController.createOwner(req, res));

export { onboardingRouter };
export default onboardingRouter;
