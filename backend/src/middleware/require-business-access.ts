import { Request, Response, NextFunction } from 'express';
import pool from '../config/db';

export function requireBusinessAccess() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.membership) {
      try {
        const result = await pool.query(
          'SELECT global_role FROM profiles WHERE id = $1',
          [req.user?.id]
        );
        if (result.rows.length > 0 && result.rows[0].global_role === 'SUPER_ADMIN') {
          next();
          return;
        }
      } catch { /* fall through to forbidden */ }
      res.status(403).json({ success: false, error: 'Forbidden: no business membership' });
      return;
    }

    if (req.membership.status !== 'active') {
      res.status(403).json({ success: false, error: 'Forbidden: membership is not active' });
      return;
    }

    const businessStatusResult = await pool.query('SELECT status FROM businesses WHERE id = $1', [req.membership.businessId]);
    if (businessStatusResult.rows.length > 0 && businessStatusResult.rows[0].status === 'disabled') {
      res.status(403).json({ success: false, error: 'BUSINESS_DISABLED' });
      return;
    }

    const slug = req.params.businessSlug || req.query.slug as string;

    if (!slug) {
      const businessId = req.query.businessId as string;
      if (businessId && req.membership.businessId !== businessId) {
        res.status(403).json({ success: false, error: 'Forbidden: you do not have access to this business' });
        return;
      }
      next();
      return;
    }

    try {
      const result = await pool.query('SELECT id FROM businesses WHERE slug = $1', [slug]);
      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }

      const businessId = result.rows[0].id;

      if (req.membership.businessId !== businessId) {
        res.status(403).json({ success: false, error: 'Forbidden: you do not have access to this business' });
        return;
      }

      next();
    } catch {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };
}
