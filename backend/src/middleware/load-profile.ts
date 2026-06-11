import { Request, Response, NextFunction } from 'express';
import pool from '../config/db';

export async function loadProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authContext) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.authContext.type === 'service') {
      req.profile = null;
      next();
      return;
    }

    const { rows } = await pool.query('SELECT * FROM profiles WHERE id = $1', [req.authContext.userId]);

    if (rows.length === 0) {
      const { rows: newProfile } = await pool.query(
         `INSERT INTO profiles (id, email, full_name, global_role)
          VALUES ($1, '', '', 'USER')
          RETURNING *`,
        [req.authContext.userId]
      );
      req.profile = newProfile[0];
      next();
      return;
    }

    req.profile = rows[0];
    next();
  } catch (error) {
    console.error('loadProfile error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
