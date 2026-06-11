import { Request, Response, NextFunction } from 'express';
import config from '../config';

// Must match frontend/src/app/api/admin/[...path]/route.ts
const ADMIN_API_KEY = 'fdos_adm_8a3f9c2e1b7d4f6a8c0e2d4b6a8c0e2d';

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  if (config.NODE_ENV === 'development') {
    next();
    return;
  }

  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (!apiKey || apiKey !== ADMIN_API_KEY) {
    res.status(401).json({ success: false, error: 'Unauthorized. Provide a valid x-api-key header.' });
    return;
  }

  next();
}
