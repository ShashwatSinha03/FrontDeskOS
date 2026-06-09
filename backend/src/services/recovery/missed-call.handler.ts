import pool from '../../config/db';
import { RecoveryService } from './recovery.service';

export class MissedCallHandler {
  constructor(private recoveryService: RecoveryService) {}

  async processMissedCalls(): Promise<number> {
    const query = `
      SELECT vc.id, vc.business_id, vc.customer_id
      FROM voice_calls vc
      WHERE vc.direction = 'inbound'
        AND vc.call_status = 'missed'
        AND vc.customer_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM follow_ups fu
          WHERE fu.customer_id = vc.customer_id
            AND fu.trigger_reason = 'missed_call'
            AND fu.status = 'pending'
        )
        AND vc.created_at > NOW() - INTERVAL '24 hours'
    `;
    const res = await pool.query(query);
    let processed = 0;

    for (const row of res.rows) {
      try {
        await this.recoveryService.scheduleRecovery(row.customer_id, row.business_id, 'missed_call', row.id);
        processed++;
      } catch (err) {
        console.error(`Missed call recovery failed for voice_call ${row.id}:`, err);
      }
    }

    return processed;
  }
}
