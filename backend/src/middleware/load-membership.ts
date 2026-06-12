import { Request, Response, NextFunction } from 'express';
import pool from '../config/db';

export interface Membership {
  userId: string;
  businessId: string;
  role: 'owner' | 'staff';
  status: 'active' | 'invited' | 'suspended';
  businessStatus?: 'active' | 'disabled';
}

export async function loadMembership(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    req.membership = null;
    next();
    return;
  }

  try {
    const query = `
      SELECT sp.user_id, sp.business_id, sp.role, sp.status, b.status AS business_status
      FROM staff_profiles sp
      JOIN businesses b ON b.id = sp.business_id
      WHERE sp.user_id = $1
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
        businessStatus: row.business_status,
      };
    } else {
      req.membership = null;
    }
  } catch {
    req.membership = null;
  }

  next();
}
