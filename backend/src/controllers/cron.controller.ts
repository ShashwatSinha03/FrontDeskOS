import { Request, Response } from 'express';
import { recoveryService } from '../services/recovery';
import { AbandonmentDetector } from '../services/recovery/abandonment-detector';
import { MissedCallHandler } from '../services/recovery/missed-call.handler';
import { logger } from '../lib/logger';

export class CronController {
  async triggerFollowUps(req: Request, res: Response): Promise<void> {
    try {
      const detector = new AbandonmentDetector(recoveryService);
      const missedCallHandler = new MissedCallHandler(recoveryService);

      const abandoned = await detector.detectAndRecover();
      const missedCallRecoveries = await missedCallHandler.processMissedCalls();
      const processed = await recoveryService.processDueRecoveries();

      res.status(200).json({
        success: true,
        message: `Recovery routine executed. Abandoned: ${abandoned}, Missed calls: ${missedCallRecoveries}, Processed: ${processed}`,
        counts: { abandoned, missedCallRecoveries, processed },
      });
    } catch (error: any) {
      logger.error('Error in recovery cron trigger', { route: 'Cron', error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({
        success: false,
        error: error.message || 'Error processing recoveries',
      });
    }
  }
}

export const cronController = new CronController();
export default cronController;
