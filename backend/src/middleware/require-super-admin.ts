import { Request, Response, NextFunction } from 'express';

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.profile) {
    res.status(403).json({ success: false, error: 'Forbidden. SUPER_ADMIN access required.' });
    return;
  }

  if (req.profile.global_role !== 'SUPER_ADMIN') {
    res.status(403).json({ success: false, error: 'Forbidden. SUPER_ADMIN access required.' });
    return;
  }

  next();
}
