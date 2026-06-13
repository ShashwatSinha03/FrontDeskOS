import { BusinessChannelRepository } from './business-channel.repository';
import { BusinessRepository } from './business.repository';
import { MessageDeliveryRepository } from './message-delivery.repository';
import { CustomerRepository } from './customer.repository';
import { ConversationRepository } from './conversation.repository';
import { AppointmentRepository } from './appointment.repository';
import { EscalationRepository } from './escalation.repository';
import { KnowledgeRequestRepository } from './knowledge.repository';
import { FollowUpRepository } from './followup.repository';
import { AvailabilityRepository } from './availability.repository';
import { SessionRepository } from './session.repository';
import { LifecycleEventRepository } from './lifecycle-event.repository';
import { NotificationRepository } from './notification.repository';

// Export instantiated singleton repository instances for runtime dependency injection
export const businessChannelRepository = new BusinessChannelRepository();
export const businessRepository = new BusinessRepository();
export const messageDeliveryRepository = new MessageDeliveryRepository();
export const customerRepository = new CustomerRepository();
export const conversationRepository = new ConversationRepository();
export const appointmentRepository = new AppointmentRepository();
export const escalationRepository = new EscalationRepository();
export const knowledgeRequestRepository = new KnowledgeRequestRepository();
export const followUpRepository = new FollowUpRepository();
export const availabilityRepository = new AvailabilityRepository();
export const sessionRepository = new SessionRepository();
export const lifecycleEventRepository = new LifecycleEventRepository();
export const notificationRepository = new NotificationRepository();

// Export classes for typing and custom initialization in testing environments
export {
  BusinessChannelRepository,
  MessageDeliveryRepository,
  BusinessRepository,
  CustomerRepository,
  ConversationRepository,
  AppointmentRepository,
  EscalationRepository,
  KnowledgeRequestRepository,
  FollowUpRepository,
  AvailabilityRepository,
  SessionRepository,
  LifecycleEventRepository,
  NotificationRepository,
};
