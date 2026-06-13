import { Router, Request, Response } from 'express';
import pool from '../config/db';
import { authenticate, loadMembership } from '../middleware';

const meRouter = Router();

meRouter.use(authenticate);
meRouter.use(loadMembership);

meRouter.get('/me/membership', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: req.membership,
  });
});

meRouter.get('/me/profile', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, global_role, created_at FROM profiles WHERE id = $1',
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      res.json({ success: true, data: null });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to load profile' });
  }
});

export { meRouter };
