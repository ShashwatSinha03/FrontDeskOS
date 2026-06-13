import { messageDeliveryRepository } from '../../repositories';

export class DeliveryAnalytics {
  async getDeliveryRate(businessId: string) {
    return messageDeliveryRepository.getDeliveryRate(businessId);
  }

  async getSentCount(businessId: string) {
    return messageDeliveryRepository.countByStatus(businessId, 'sent');
  }

  async getDeliveredCount(businessId: string) {
    return messageDeliveryRepository.countByStatus(businessId, 'delivered');
  }

  async getFailedCount(businessId: string) {
    return messageDeliveryRepository.countByStatus(businessId, 'failed');
  }

  async getPendingCount(businessId: string) {
    return messageDeliveryRepository.countByStatus(businessId, 'pending');
  }

  async getTotalCount(businessId: string) {
    return messageDeliveryRepository.countTotal(businessId);
  }

  async getSummary(businessId: string) {
    const [total, sent, delivered, failed, pending, rate] = await Promise.all([
      this.getTotalCount(businessId),
      this.getSentCount(businessId),
      this.getDeliveredCount(businessId),
      this.getFailedCount(businessId),
      this.getPendingCount(businessId),
      this.getDeliveryRate(businessId),
    ]);

    return {
      total,
      sent,
      delivered,
      failed,
      pending,
      deliveryRate: rate.rate,
    };
  }
}

export const deliveryAnalytics = new DeliveryAnalytics();
