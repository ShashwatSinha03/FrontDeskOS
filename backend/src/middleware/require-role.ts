import { Request, Response, NextFunction } from 'express';
import pool from '../config/db';

export function requireRole(...allowedRoles: string[]) {
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

    if (!allowedRoles.includes(req.membership.role)) {
      res.status(403).json({ success: false, error: 'Forbidden: insufficient role' });
      return;
    }

    next();
  };
}

export const requireOwner = () => requireRole('owner');
export const requireStaff = () => requireRole('owner', 'staff');
