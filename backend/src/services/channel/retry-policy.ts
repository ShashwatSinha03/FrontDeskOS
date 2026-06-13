export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
}

export interface DeliveryJob {
  deliveryId: string;
  messageId: string;
  conversationId: string;
  businessId: string;
  channelType: string;
  provider: string;
  content: string;
  attemptNumber: number;
  lastAttemptAt: Date | null;
  scheduledAt: Date;
}

export interface DeliveryQueue {
  enqueue(job: DeliveryJob): Promise<void>;
  dequeue(): Promise<DeliveryJob | null>;
  scheduleRetry(job: DeliveryJob, policy: RetryPolicy): Promise<void>;
  remove(deliveryId: string): Promise<void>;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoffMs: 30_000,
  backoffMultiplier: 4,
  maxBackoffMs: 1_800_000,
};

export function calculateNextRetry(attempt: number, policy: RetryPolicy): Date {
  const delay = Math.min(
    policy.backoffMs * Math.pow(policy.backoffMultiplier, attempt - 1),
    policy.maxBackoffMs
  );
  return new Date(Date.now() + delay);
}

export function shouldRetry(attempt: number, policy: RetryPolicy): boolean {
  return attempt < policy.maxAttempts;
}
