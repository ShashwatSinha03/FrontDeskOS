import { Request, Response, NextFunction } from 'express';
import { verifyTurnstile } from '../services/turnstile.service';
import config from '../config';

export function requireTurnstile() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!config.TURNSTILE_SECRET_KEY) {
      next();
      return;
    }

    const token = req.body.turnstileToken;

    if (!token) {
      res.status(400).json({ success: false, error: 'Verification failed. Please try again.' });
      return;
    }

    const isValid = await verifyTurnstile(token);

    if (!isValid) {
      res.status(403).json({ success: false, error: 'Verification failed. Please try again.' });
      return;
    }

    next();
  };
}
