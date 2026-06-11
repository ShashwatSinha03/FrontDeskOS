import { Request, Response, NextFunction } from 'express';
import pool from '../config/db';

export interface Membership {
  userId: string;
  businessId: string;
  role: 'owner' | 'staff';
  status: 'active' | 'invited' | 'suspended';
}

export async function loadMembership(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    req.membership = null;
    next();
    return;
  }

  try {
    const query = `
      SELECT user_id, business_id, role, status
      FROM staff_profiles
      WHERE user_id = $1
      LIMIT 1
    `;
    const result = await pool.query(query, [req.user.id]);

    if (result.rows.length > 0) {
      const row = result.rows[0];
      req.membership = {
        userId: row.user_id,
        businessId: row.business_id,
        role: row.role,
        status: row.status,
      };
    } else {
      req.membership = null;
    }
  } catch {
    req.membership = null;
  }

  next();
}
