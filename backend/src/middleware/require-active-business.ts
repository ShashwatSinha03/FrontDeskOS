import { Request, Response, NextFunction } from 'express';
import pool from '../config/db';

export function requireActiveBusiness() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = req.body?.businessId || req.query?.businessId as string;

    if (!businessId) {
      res.status(400).json({ success: false, error: 'businessId is required' });
      return;
    }

    try {
      const result = await pool.query(
        'SELECT status FROM businesses WHERE id = $1',
        [businessId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }

      if (result.rows[0].status === 'disabled') {
        res.status(403).json({ success: false, error: 'BUSINESS_DISABLED' });
        return;
      }

      next();
    } catch {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };
}
