import { Request, Response, NextFunction } from 'express';
import config from '../config';

const PUBLIC_PREFIXES = ['/public', '/chat', '/health'];

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  if (PUBLIC_PREFIXES.some(p => req.path.startsWith(p))) {
    next();
    return;
  }

  if (config.NODE_ENV === 'development') {
    next();
    return;
  }

  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (!apiKey || apiKey !== config.ADMIN_API_KEY) {
    res.status(401).json({ success: false, error: 'Unauthorized. Provide a valid x-api-key header.' });
    return;
  }

  next();
}
