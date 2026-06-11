import { Router, Request, Response } from 'express';
import { authenticate, loadMembership, requireOwner } from '../middleware';

const adminUserRouter = Router();

adminUserRouter.use(authenticate);
adminUserRouter.use(loadMembership);
adminUserRouter.use(requireOwner());

// Placeholder — mutation routes will be added when migrated from API-key auth.
// These serve as the future user-authenticated replacement for adminRouter mutations.
adminUserRouter.get('/_health', (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'user-admin-router active' } });
});

export { adminUserRouter };
