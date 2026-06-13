import { Request, Response, NextFunction } from 'express';
import { verifyTurnstile } from '../services/turnstile.service';

export function requireTurnstile() {
  return async (req: Request, res: Response, next: NextFunction) => {
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
