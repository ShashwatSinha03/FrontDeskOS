import { Request, Response, NextFunction } from 'express';

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.membership) {
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
