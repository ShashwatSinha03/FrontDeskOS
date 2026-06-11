import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import pool from '../config/db';
import config from '../config';
import { notificationService } from '../services/notification.service';

export class TeamController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;

      const result = await pool.query(`
        SELECT sp.id, sp.user_id, sp.role, sp.status, sp.full_name, sp.created_at,
          p.email
        FROM staff_profiles sp
        JOIN profiles p ON p.id = sp.user_id
        WHERE sp.business_id = $1
        ORDER BY sp.created_at DESC
      `, [businessId]);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('[Team] List error:', error);
      res.status(500).json({ success: false, error: 'Failed to load team' });
    }
  }

  async invite(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.membership!.businessId;
      const { email, name, role } = req.body;

      if (!email) {
        res.status(400).json({ success: false, error: 'Email is required' });
        return;
      }

      const staffRole = role === 'owner' ? 'owner' : 'staff';

      // Create auth user
      const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: name || email },
      });

      if (authError || !authUser.user) {
        console.error('[Team] Auth user creation failed:', authError);
        res.status(500).json({ success: false, error: 'Failed to create user' });
        return;
      }

      // Create membership
      const insertResult = await pool.query(`
        INSERT INTO staff_profiles (user_id, business_id, role, status, full_name)
        VALUES ($1, $2, $3, 'invited', $4)
        RETURNING id, user_id, role, status
      `, [authUser.user.id, businessId, staffRole, name || email]);

      console.log(`[Team] Staff invited: business=${businessId} userId=${authUser.user.id} role=${staffRole}`);

      await notificationService.create({
        businessId, type: 'staff_invited', title: 'Staff Invited',
        message: `${name || email} was invited as ${staffRole}.`,
        entityType: 'staff_profile', entityId: insertResult.rows[0].id,
      });

      res.status(201).json({
        success: true,
        data: {
          id: insertResult.rows[0].id,
          userId: authUser.user.id,
          role: staffRole,
          status: 'invited',
        },
      });
    } catch (error) {
      console.error('[Team] Invite error:', error);
      res.status(500).json({ success: false, error: 'Failed to invite staff' });
    }
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const businessId = req.membership!.businessId;
      const { status } = req.body;

      if (!status || !['active', 'invited', 'suspended'].includes(status)) {
        res.status(400).json({ success: false, error: 'Status must be "active", "invited", or "suspended"' });
        return;
      }

      const result = await pool.query(`
        UPDATE staff_profiles SET status = $1, updated_at = NOW()
        WHERE id = $2 AND business_id = $3
        RETURNING id, user_id, role, status
      `, [status, id, businessId]);

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Staff member not found' });
        return;
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('[Team] Update status error:', error);
      res.status(500).json({ success: false, error: 'Failed to update staff status' });
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const businessId = req.membership!.businessId;

      const nameRes = await pool.query('SELECT full_name FROM staff_profiles WHERE id = $1 AND business_id = $2', [id, businessId]);
      const removedName = nameRes.rows[0]?.full_name || 'A staff member';

      const result = await pool.query(
        `DELETE FROM staff_profiles WHERE id = $1 AND business_id = $2 AND role = 'staff'`,
        [id, businessId]
      );

      if (result.rowCount === 0) {
        res.status(404).json({ success: false, error: 'Staff member not found or cannot be removed' });
        return;
      }

      await notificationService.create({
        businessId, type: 'staff_removed', title: 'Staff Removed',
        message: `${removedName} was removed from the team.`,
        entityType: 'staff_profile', entityId: id,
      });

      res.json({ success: true, data: { removed: true } });
    } catch (error) {
      console.error('[Team] Remove error:', error);
      res.status(500).json({ success: false, error: 'Failed to remove staff' });
    }
  }

  async promote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const businessId = req.membership!.businessId;

      const result = await pool.query(`
        UPDATE staff_profiles SET role = 'owner', status = 'active', updated_at = NOW()
        WHERE id = $1 AND business_id = $2
        RETURNING id, user_id, role, status
      `, [id, businessId]);

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Staff member not found' });
        return;
      }

      console.log(`[Team] Staff promoted to owner: profileId=${id} business=${businessId}`);

      const promProfile = result.rows[0];
      const promNameRes = await pool.query('SELECT full_name FROM staff_profiles WHERE id = $1', [id]);
      const promName = promNameRes.rows[0]?.full_name || 'A staff member';
      await notificationService.create({
        businessId, type: 'staff_promoted', title: 'Staff Promoted',
        message: `${promName} promoted to owner.`,
        entityType: 'staff_profile', entityId: id,
      });

      res.json({ success: true, data: promProfile });
    } catch (error) {
      console.error('[Team] Promote error:', error);
      res.status(500).json({ success: false, error: 'Failed to promote staff' });
    }
  }
}

export const teamController = new TeamController();
