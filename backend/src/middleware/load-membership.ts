import { Request, Response, NextFunction } from 'express';
import pool from '../config/db';

export async function loadMembership(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authContext) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.authContext.type === 'service') {
      req.membership = null;
      next();
      return;
    }

    let businessId = (req.query.businessId as string) || (req.params.businessId as string);

    if (!businessId && (req.query.slug as string)) {
      const slug = req.query.slug as string;
      const { rows } = await pool.query('SELECT id FROM businesses WHERE slug = $1', [slug]);
      if (rows.length > 0) {
        businessId = rows[0].id;
      }
    }

    if (!businessId && req.params.slug) {
      const { rows } = await pool.query('SELECT id FROM businesses WHERE slug = $1', [req.params.slug]);
      if (rows.length > 0) {
        businessId = rows[0].id;
      }
    }

    if (!businessId) {
      req.membership = null;
      next();
      return;
    }

    const { rows } = await pool.query(
      'SELECT * FROM staff_profiles WHERE user_id = $1 AND business_id = $2 AND status = $3',
      [req.authContext.userId, businessId, 'accepted']
    );

    req.membership = rows.length > 0 ? rows[0] : null;
    next();
  } catch (error) {
    console.error('loadMembership error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
