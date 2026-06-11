import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../../config/db';
import { supabaseAdmin } from '../../lib/supabase';

const teamRouter = Router();

async function verifyOwnership(userId: string, businessId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT id FROM staff_profiles WHERE user_id = $1 AND business_id = $2 AND role = 'owner' AND status = 'accepted'`,
    [userId, businessId]
  );
  return rows.length > 0;
}

teamRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { businessId } = z.object({
      businessId: z.string().uuid(),
    }).parse(req.query);

    if (!(await verifyOwnership(req.authContext!.userId!, businessId))) {
      res.status(403).json({ success: false, error: 'Forbidden. Owner access required.' });
      return;
    }

    const result = await pool.query(
      `SELECT sp.*, p.email, p.full_name as profile_name
       FROM staff_profiles sp
       JOIN profiles p ON p.id = sp.user_id
       WHERE sp.business_id = $1
       ORDER BY sp.created_at DESC`,
      [businessId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List team error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

teamRouter.post('/invite', async (req: Request, res: Response) => {
  try {
    const { businessId, email, name, role } = z.object({
      businessId: z.string().uuid(),
      email: z.string().email(),
      name: z.string().min(1).max(255),
      role: z.enum(['manager', 'staff']),
    }).parse(req.body);

    if (!(await verifyOwnership(req.authContext!.userId!, businessId))) {
      res.status(403).json({ success: false, error: 'Forbidden. Owner access required.' });
      return;
    }

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name },
    });

    if (inviteError) {
      res.status(400).json({ success: false, error: inviteError.message });
      return;
    }

    const { rows } = await pool.query(
      `INSERT INTO staff_profiles (user_id, business_id, role, full_name, status, invited_by, invited_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, NOW())
       RETURNING *`,
      [inviteData.user.id, businessId, role, name, req.authContext!.userId]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Invite staff error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

teamRouter.patch('/:membershipId', async (req: Request, res: Response) => {
  try {
    const { membershipId } = z.object({
      membershipId: z.string().uuid(),
    }).parse(req.params);

    const { role, status } = z.object({
      role: z.enum(['manager', 'staff']).optional(),
      status: z.enum(['accepted', 'suspended']).optional(),
    }).parse(req.body);

    const membership = await pool.query(
      `SELECT sp.*, p.email FROM staff_profiles sp JOIN profiles p ON p.id = sp.user_id WHERE sp.id = $1`,
      [membershipId]
    );

    if (!membership.rows.length) {
      res.status(404).json({ success: false, error: 'Membership not found' });
      return;
    }

    const mem = membership.rows[0];

    if (!(await verifyOwnership(req.authContext!.userId!, mem.business_id))) {
      res.status(403).json({ success: false, error: 'Forbidden. Owner access required.' });
      return;
    }

    if (mem.user_id === req.authContext!.userId) {
      res.status(400).json({ success: false, error: 'Cannot change your own role or status' });
      return;
    }

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
    params.push(membershipId);

    const result = await pool.query(
      `UPDATE staff_profiles SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update team member error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

teamRouter.delete('/:membershipId', async (req: Request, res: Response) => {
  try {
    const { membershipId } = z.object({
      membershipId: z.string().uuid(),
    }).parse(req.params);

    const membership = await pool.query(
      `SELECT * FROM staff_profiles WHERE id = $1`,
      [membershipId]
    );

    if (!membership.rows.length) {
      res.status(404).json({ success: false, error: 'Membership not found' });
      return;
    }

    const mem = membership.rows[0];

    if (!(await verifyOwnership(req.authContext!.userId!, mem.business_id))) {
      res.status(403).json({ success: false, error: 'Forbidden. Owner access required.' });
      return;
    }

    if (mem.user_id === req.authContext!.userId) {
      res.status(400).json({ success: false, error: 'Cannot remove yourself' });
      return;
    }

    await pool.query(`DELETE FROM staff_profiles WHERE id = $1`, [membershipId]);

    res.json({ success: true, data: { id: membershipId } });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export { teamRouter };
