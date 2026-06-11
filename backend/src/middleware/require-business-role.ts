import { Request, Response, NextFunction } from 'express';

export function requireBusinessRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.membership) {
      res.status(403).json({ success: false, error: 'No business membership found' });
      return;
    }

    if (!roles.includes(req.membership.role)) {
      res.status(403).json({ success: false, error: `Forbidden. Required role: ${roles.join(', ')}` });
      return;
    }

    next();
  };
}
