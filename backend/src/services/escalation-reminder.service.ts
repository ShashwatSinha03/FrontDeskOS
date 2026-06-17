import pool from '../config/db';
import { notificationService } from './notification.service';
import { logger } from '../lib/logger';

const THRESHOLDS = [
  { minutes: 5, type: 'escalation_reminder_5min', title: 'Escalation Unattended — 5 minutes', message: (name: string) => `Escalation for ${name} has been waiting 5 minutes.` },
  { minutes: 15, type: 'escalation_reminder_15min', title: 'Escalation Unattended — 15 minutes', message: (name: string) => `Escalation for ${name} has been waiting 15 minutes.` },
  { minutes: 30, type: 'escalation_reminder_30min', title: 'Escalation Unattended — 30 minutes', message: (name: string) => `Escalation for ${name} has been waiting 30 minutes.` },
];

export class EscalationReminderService {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  start(): void {
    if (this.intervalId) return;
    logger.info('EscalationReminderService started');
    this.intervalId = setInterval(() => this.check(), 60_000);
    this.check();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('EscalationReminderService stopped');
    }
  }

  private async check(): Promise<void> {
    try {
      for (const threshold of THRESHOLDS) {
        const result = await pool.query(`
          SELECT c.id, c.business_id, cust.name AS customer_name
          FROM conversations c
          LEFT JOIN customers cust ON cust.id = c.customer_id
          WHERE c.ownership_status = 'human_pending'
            AND c.escalated_at <= NOW() - INTERVAL '1 minute' * $1
            AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.business_id = c.business_id
                AND n.type = $2
                AND n.entity_id = c.id::text
            )
        `, [threshold.minutes, threshold.type]);

        for (const row of result.rows) {
          await notificationService.create({
            businessId: row.business_id,
            type: threshold.type,
            title: threshold.title,
            message: threshold.message(row.customer_name || 'Unknown customer'),
            entityType: 'conversation',
            entityId: row.id,
          });
          logger.info('EscalationReminder: Created notification', {
            businessId: row.business_id,
            conversationId: row.id,
            type: threshold.type,
          });
        }
      }
    } catch (err) {
      logger.error('EscalationReminder: Check failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export const escalationReminderService = new EscalationReminderService();
