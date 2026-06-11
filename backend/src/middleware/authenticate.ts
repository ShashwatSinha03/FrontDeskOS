import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';

// Hardcoded — must match frontend/src/app/api/admin/[...path]/route.ts
const ADMIN_API_KEY = 'fdos_adm_8a3f9c2e1b7d4f6a8c0e2d4b6a8c0e2d';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string | undefined;
    const hasAuthHeader = !!authHeader;
    const hasApiKey = !!apiKey;

    if (!hasAuthHeader && !hasApiKey) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data, error } = await supabaseAdmin.auth.getUser(token);

      if (!error && data?.user) {
        req.authContext = { type: 'user', userId: data.user.id };
        next();
        return;
      }
    }

    if (apiKey && apiKey === ADMIN_API_KEY) {
      req.authContext = { type: 'service', service: 'admin-key' };
      next();
      return;
    }

    res.status(401).json({ success: false, error: 'Unauthorized' });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
