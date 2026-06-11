import { Router, Request, Response } from 'express';
import { onboardingController } from '../controllers/onboarding.controller';

const onboardingRouter = Router();

onboardingRouter.get('/onboarding/templates/:industry', (req: Request, res: Response) => onboardingController.getTemplates(req, res));
onboardingRouter.post('/onboarding/publish', (req: Request, res: Response) => onboardingController.publish(req, res));
onboardingRouter.post('/onboarding/owner', (req: Request, res: Response) => onboardingController.createOwner(req, res));

export { onboardingRouter };
export default onboardingRouter;
