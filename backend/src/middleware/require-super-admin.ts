import { Request, Response, NextFunction } from 'express';
import pool from '../config/db';

export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT global_role FROM profiles WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || result.rows[0].global_role !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, error: 'Forbidden: SUPER_ADMIN role required' });
      return;
    }

    next();
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
