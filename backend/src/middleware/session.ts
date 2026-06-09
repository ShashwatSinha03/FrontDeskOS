import { Request, Response, NextFunction } from 'express';

export function resolveSession(req: Request, _res: Response, next: NextFunction): void {
  const sessionId = req.headers['x-session-id'] as string || req.body?.sessionId;
  if (sessionId) {
    req.sessionId = sessionId;
  }
  next();
}
