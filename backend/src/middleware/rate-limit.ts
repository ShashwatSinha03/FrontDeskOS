import rateLimit from 'express-rate-limit';
import { Request } from 'express';

export function createRateLimiter(
  maxRequests: number,
  windowMs: number = 15 * 60 * 1000,
  skipFn?: (req: Request) => boolean
) {
  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { success: false, error: 'Too many requests. Please try again later.' },
    skip: skipFn,
    keyGenerator: (req: Request): string => {
      const businessId = (req as any).businessId || req.body?.businessId || req.query?.businessId;
      const ip = req.ip || 'unknown';
      return businessId ? `${businessId}-${ip}` : ip;
    },
  });
}
