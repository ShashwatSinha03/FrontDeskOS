import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from '../services/subscription.service';

export async function requireSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let businessId: string | null = null;

    if (req.membership?.business_id) {
      businessId = req.membership.business_id;
    } else if (req.query?.businessId) {
      businessId = req.query.businessId as string;
    } else if (req.body?.businessId) {
      businessId = req.body.businessId as string;
    }

    if (!businessId) {
      res.status(400).json({ success: false, error: 'businessId is required' });
      return;
    }

    const capabilities = await subscriptionService.getSubscriptionCapabilities(businessId);
    req.subscriptionCapabilities = capabilities;

    const method = req.method.toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !capabilities.canMutateData) {
      res.status(403).json({
        success: false,
        error: 'Your subscription is suspended. Reactivate your account to make changes.',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('[requireSubscription] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify subscription status' });
  }
}
