import pool from '../../config/db';
import { conversationRepository, customerRepository, businessRepository } from '../../repositories';
import { RecoveryService } from './recovery.service';

export class AbandonmentDetector {
  constructor(private recoveryService: RecoveryService) {}

  async detectAndRecover(): Promise<number> {
    const businesses = await this.getAllBusinessIds();
    let totalDetected = 0;

    for (const businessId of businesses) {
      const business = await businessRepository.findById(businessId);
      if (!business) continue;

      const timeout = business.appointmentSettings?.recoveryConfig?.inactivityTimeoutMinutes ?? 10;
      const inactiveConversations = await conversationRepository.findActiveByInactivity(timeout);

      for (const conv of inactiveConversations) {
        const customer = await customerRepository.findById(conv.customerId);
        if (!customer) continue;

        const terminalStates = ['Booked', 'Customer', 'Escalated', 'Lost'];
        if (terminalStates.includes(customer.lifecycleState)) continue;

        const existing = await this.recoveryService.hasPendingRecovery(conv.customerId);
        if (existing) continue;

        await this.recoveryService.scheduleRecovery(conv.customerId, businessId, 'inactivity');
        totalDetected++;
      }
    }

    return totalDetected;
  }

  private async getAllBusinessIds(): Promise<string[]> {
    const query = `SELECT id FROM businesses`;
    const res = await pool.query(query);
    return res.rows.map(r => r.id);
  }
}
