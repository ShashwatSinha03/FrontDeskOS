import { notificationRepository } from '../repositories';

export class NotificationService {
  async create(data: {
    businessId: string;
    type: string;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
  }) {
    return notificationRepository.create(data);
  }
}

export const notificationService = new NotificationService();
