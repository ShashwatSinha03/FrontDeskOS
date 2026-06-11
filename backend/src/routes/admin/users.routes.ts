import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../../config/db';

const usersRouter = Router();

usersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.q as string || '').trim();

    let whereClause = '';
    const params: string[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause = `WHERE (p.email ILIKE $${paramIndex} OR p.full_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM profiles p ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT p.*, COALESCE(
        json_agg(
          json_build_object(
            'id', sp.id,
            'business_id', sp.business_id,
            'business_name', b.name,
            'business_slug', b.slug,
            'role', sp.role,
            'status', sp.status
          )
        ) FILTER (WHERE sp.id IS NOT NULL),
        '[]'::json
      ) as memberships
      FROM profiles p
      LEFT JOIN staff_profiles sp ON sp.user_id = p.id
      LEFT JOIN businesses b ON b.id = sp.business_id
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({ success: true, data: result.rows, total, page, limit });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

usersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

    const result = await pool.query(
      `SELECT p.*, COALESCE(
        json_agg(
          json_build_object(
            'id', sp.id,
            'business_id', sp.business_id,
            'business_name', b.name,
            'business_slug', b.slug,
            'role', sp.role,
            'status', sp.status
          )
        ) FILTER (WHERE sp.id IS NOT NULL),
        '[]'::json
      ) as memberships
      FROM profiles p
      LEFT JOIN staff_profiles sp ON sp.user_id = p.id
      LEFT JOIN businesses b ON b.id = sp.business_id
      WHERE p.id = $1
      GROUP BY p.id`,
      [id]
    );

    if (!result.rows.length) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

usersRouter.patch('/:id/role', async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { global_role } = z.object({
      global_role: z.enum(['SUPER_ADMIN', 'USER']),
    }).parse(req.body);

    const result = await pool.query(
      `UPDATE profiles SET global_role = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [global_role, id]
    );

    if (!result.rows.length) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

usersRouter.patch('/:userId/memberships/:membershipId', async (req: Request, res: Response) => {
  try {
    const { userId, membershipId } = z.object({
      userId: z.string().uuid(),
      membershipId: z.string().uuid(),
    }).parse(req.params);

    const { role, status } = z.object({
      role: z.enum(['owner', 'manager', 'staff']).optional(),
      status: z.enum(['accepted', 'suspended']).optional(),
    }).parse(req.body);

    const setClauses: string[] = [];
    const params: string[] = [];
    let paramIndex = 1;

    if (role) {
      setClauses.push(`role = $${paramIndex++}`);
      params.push(role);
    }
    if (status) {
      setClauses.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (!setClauses.length) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(userId, membershipId);

    const result = await pool.query(
      `UPDATE staff_profiles SET ${setClauses.join(', ')} WHERE user_id = $${paramIndex} AND id = $${paramIndex + 1} RETURNING *`,
      params
    );

    if (!result.rows.length) {
      res.status(404).json({ success: false, error: 'Membership not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update membership error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

usersRouter.delete('/:userId/memberships/:membershipId', async (req: Request, res: Response) => {
  try {
    const { userId, membershipId } = z.object({
      userId: z.string().uuid(),
      membershipId: z.string().uuid(),
    }).parse(req.params);

    const result = await pool.query(
      `DELETE FROM staff_profiles WHERE user_id = $1 AND id = $2 RETURNING *`,
      [userId, membershipId]
    );

    if (!result.rows.length) {
      res.status(404).json({ success: false, error: 'Membership not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Delete membership error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export { usersRouter };
