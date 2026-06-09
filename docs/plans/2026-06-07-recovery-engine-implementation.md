# Recovery Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the rigid follow-up system with a configurable Recovery Engine supporting channel adapters, abandonment detection, missed-call recovery, and per-business recovery sequences.

**Architecture:** Channel adapters (WebChat, WhatsApp placeholder, Voice placeholder) send recovery messages through an abstraction layer. An AbandonmentDetector scans for inactive conversations and triggers business-specific recovery sequences. A RecoveryService orchestrates the full lifecycle.

**Tech Stack:** TypeScript, Express.js, PostgreSQL (raw `pg`), Zod validation.

**Design doc:** `docs/plans/2026-06-07-recovery-engine-design.md`

---

### Task 1: Database Schema Migration (enhance follow_ups + recovery_settings)

**Files:**
- Modify: `database/schema.sql`

Add new columns to `follow_ups` table. Replace the existing CREATE TABLE with the enhanced version:

```sql
-- Follow-Ups / Recovery Steps Table
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type follow_up_type NOT NULL,
  channel VARCHAR(50) NOT NULL DEFAULT 'web_chat',
  trigger_reason VARCHAR(50) NOT NULL DEFAULT 'inactivity',
  attempt_number INT NOT NULL DEFAULT 1,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status follow_up_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Add `follow_up_type` enum value:
```sql
ALTER TYPE follow_up_type ADD VALUE IF NOT EXISTS 'missed_call';
```

Add recovery_settings to the seed data's `appointment_settings` JSONB:
```json
{
  "slotDurationMinutes": 30,
  "workingHours": {...},
  "recoveryConfig": {
    "inactivityTimeoutMinutes": 10,
    "sequences": {
      "default": [
        {"type": "re_engagement", "delayMinutes": 15, "channel": "web_chat"},
        {"type": "day_1", "delayHours": 24, "channel": "web_chat"},
        {"type": "day_3", "delayHours": 72, "channel": "web_chat"}
      ]
    }
  }
}
```

---

### Task 2: TypeScript Types

**Files:**
- Modify: `backend/src/types/index.ts`
- Modify: `frontend/src/types/index.ts`

Add new types and enhance existing ones:

```typescript
export type FollowUpType = 're_engagement' | 'day_1' | 'day_3' | 'missed_call';
export type FollowUpChannel = 'web_chat' | 'whatsapp' | 'voice' | 'sms';
export type FollowUpTriggerReason = 'inactivity' | 'missed_call' | 'booking_no_show' | 'manual';

export interface RecoveryStep {
  type: FollowUpType;
  delayMinutes?: number;
  delayHours?: number;
  channel: FollowUpChannel;
}

export interface RecoveryConfig {
  inactivityTimeoutMinutes: number;
  sequences: Record<string, RecoveryStep[]>;
}

export interface RecoveryChannel {
  name: string;
  send(params: {
    businessId: string;
    customerId: string;
    conversationId?: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<{ sent: boolean; externalId?: string }>;
}

// Enhanced FollowUp
export interface FollowUp {
  id: string;
  customerId: string;
  businessId: string;
  type: FollowUpType;
  channel: FollowUpChannel;
  triggerReason: FollowUpTriggerReason;
  attemptNumber: number;
  scheduledAt: Date;
  status: FollowUpStatus;
  sentAt: Date | null;
  resolvedAt: Date | null;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

Also add `AppointmentSettings` recoveryConfig field:
```typescript
export interface AppointmentSettings {
  slotDurationMinutes: number;
  workingHours: { ... };
  bufferMinutesBefore?: number;
  bufferMinutesAfter?: number;
  recoveryConfig?: RecoveryConfig;
}
```

---

### Task 3: Recovery Channel Adapters

**Files:**
- Create: `backend/src/services/recovery/channel.interface.ts`
- Create: `backend/src/services/recovery/webchat.channel.ts`
- Create: `backend/src/services/recovery/whatsapp.channel.ts`
- Create: `backend/src/services/recovery/voice.channel.ts`
- Create: `backend/src/services/recovery/index.ts`

**channel.interface.ts:**
```typescript
export interface RecoveryChannel {
  name: string;
  send(params: {
    businessId: string;
    customerId: string;
    conversationId?: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<{ sent: boolean; externalId?: string }>;
}
```

**webchat.channel.ts:**
```typescript
import { RecoveryChannel } from './channel.interface';
import { conversationRepository } from '../../repositories';

export class WebChatChannel implements RecoveryChannel {
  name = 'web_chat';

  async send(params: {
    businessId: string;
    customerId: string;
    conversationId?: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<{ sent: boolean; externalId?: string }> {
    let conversationId = params.conversationId;
    if (!conversationId) {
      const conv = await conversationRepository.findActiveByCustomer(params.customerId);
      if (!conv) {
        conv = await conversationRepository.create(params.customerId, params.businessId, 'web_chat');
      }
      conversationId = conv.id;
    }

    const msg = await conversationRepository.addMessage(
      conversationId,
      'system',
      `[Recovery] ${params.content}`,
      { recovery: true, ...params.metadata }
    );

    return { sent: true, externalId: msg.id };
  }
}
```

**whatsapp.channel.ts:**
```typescript
import { RecoveryChannel } from './channel.interface';

export class WhatsAppChannel implements RecoveryChannel {
  name = 'whatsapp';

  async send(_params: {
    businessId: string;
    customerId: string;
    conversationId?: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<{ sent: boolean; externalId?: string }> {
    throw new Error('WhatsApp channel not yet implemented. Integrate with WhatsApp Business API.');
  }
}
```

**voice.channel.ts:**
```typescript
import { RecoveryChannel } from './channel.interface';

export class VoiceChannel implements RecoveryChannel {
  name = 'voice';

  async send(_params: {
    businessId: string;
    customerId: string;
    conversationId?: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<{ sent: boolean; externalId?: string }> {
    throw new Error('Voice channel not yet implemented. Integrate with Twilio.');
  }
}
```

**sms.channel.ts:**
```typescript
import { RecoveryChannel } from './channel.interface';

export class SmsChannel implements RecoveryChannel {
  name = 'sms';

  async send(_params: {
    businessId: string;
    customerId: string;
    conversationId?: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<{ sent: boolean; externalId?: string }> {
    throw new Error('SMS channel not yet implemented. Integrate with Twilio SMS API.');
  }
}
```

**index.ts:**
```typescript
export { RecoveryChannel } from './channel.interface';
export { WebChatChannel } from './webchat.channel';
export { WhatsAppChannel } from './whatsapp.channel';
export { VoiceChannel } from './voice.channel';
export { SmsChannel } from './sms.channel';
```

---

### Task 4: Abandonment Detector

**Files:**
- Create: `backend/src/services/recovery/abandonment-detector.ts`
- Modify: `backend/src/repositories/conversation.repository.ts` (add method)

Add to `conversation.repository.ts`:
```typescript
async findActiveByInactivity(timeoutMinutes: number): Promise<{ id: string; customerId: string; businessId: string; lastMessageAt: Date }[]> {
  const query = `
    SELECT c.id, c.customer_id, c.business_id, MAX(m.created_at) as last_message_at
    FROM conversations c
    JOIN messages m ON m.conversation_id = c.id
    WHERE c.status = 'active'
    GROUP BY c.id, c.customer_id, c.business_id
    HAVING MAX(m.created_at) < NOW() - INTERVAL '1 minute' * $1
    ORDER BY last_message_at ASC
  `;
  const res = await pool.query(query, [timeoutMinutes]);
  return res.rows.map(r => ({
    id: r.id,
    customerId: r.customer_id,
    businessId: r.business_id,
    lastMessageAt: new Date(r.last_message_at),
  }));
}
```

**abandonment-detector.ts:**
```typescript
import { conversationRepository, customerRepository, followUpRepository } from '../repositories';
import { businessRepository } from '../../repositories'; // relative path depends on dir depth
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
```

---

### Task 5: RecoveryService (replaces FollowUpService)

**Files:**
- Create: `backend/src/services/recovery/recovery.service.ts`
- Modify: `backend/src/services/index.ts` (add export)
- Delete or redirect: `backend/src/services/followup.service.ts`

**recovery.service.ts:**

```typescript
import {
  followUpRepository,
  customerRepository,
  conversationRepository,
  businessRepository,
} from '../../repositories';
import { LLMProviderFactory } from '../llm/provider.factory';
import { RecoveryChannel, WebChatChannel, WhatsAppChannel, VoiceChannel, SmsChannel } from './index';
import { FollowUp, RecoveryStep, RecoveryConfig } from '../../types';
import pool from '../../config/db';

export class RecoveryService {
  private channels: Map<string, RecoveryChannel> = new Map();

  constructor() {
    this.registerChannel(new WebChatChannel());
    this.registerChannel(new WhatsAppChannel());
    this.registerChannel(new VoiceChannel());
    this.registerChannel(new SmsChannel());
  }

  registerChannel(channel: RecoveryChannel): void {
    this.channels.set(channel.name, channel);
  }

  async hasPendingRecovery(customerId: string): Promise<boolean> {
    const query = `
      SELECT id FROM follow_ups
      WHERE customer_id = $1 AND status = 'pending'
      LIMIT 1
    `;
    const res = await pool.query(query, [customerId]);
    return res.rows.length > 0;
  }

  async scheduleRecovery(customerId: string, businessId: string, reason: string = 'inactivity'): Promise<void> {
    const business = await businessRepository.findById(businessId);
    if (!business) throw new Error(`Business '${businessId}' not found`);

    const config = business.appointmentSettings?.recoveryConfig;
    const sequence = config?.sequences?.[reason] || config?.sequences?.['default'] || this.defaultSequence();

    await customerRepository.updateLifecycleState(customerId, 'Follow-Up Pending');

    let cumulativeMinutes = 0;
    for (const step of sequence) {
      const delayMin = step.delayMinutes ?? ((step.delayHours ?? 0) * 60);
      cumulativeMinutes += delayMin;

      const scheduledAt = new Date();
      scheduledAt.setMinutes(scheduledAt.getMinutes() + cumulativeMinutes);

      await followUpRepository.schedule({
        customerId,
        businessId,
        type: step.type,
        scheduledAt,
      });
    }
  }

  async processDueRecoveries(): Promise<number> {
    const dueList = await followUpRepository.findDueToProcess(new Date());
    if (dueList.length === 0) return 0;

    let processed = 0;
    for (const followUp of dueList) {
      await this.executeStep(followUp);
      processed++;
    }

    return processed;
  }

  private async executeStep(followUp: FollowUp): Promise<void> {
    try {
      const customer = await customerRepository.findById(followUp.customerId);
      if (!customer || ['Booked', 'Customer', 'Lost'].includes(customer.lifecycleState)) {
        await followUpRepository.cancelPending(followUp.customerId);
        return;
      }

      const channel = this.channels.get(followUp.channel);
      if (!channel) {
        console.error(`No channel adapter for '${followUp.channel}'`);
        return;
      }

      const content = await this.generateRecoveryContent(followUp);

      const conversation = await conversationRepository.findActiveByCustomer(followUp.customerId) ||
        await conversationRepository.create(followUp.customerId, followUp.businessId, 'web_chat');

      await channel.send({
        businessId: followUp.businessId,
        customerId: followUp.customerId,
        conversationId: conversation.id,
        content,
        metadata: { followUpId: followUp.id, type: followUp.type },
      });

      await followUpRepository.markSent(followUp.id);

      if (followUp.type === 'day_3') {
        await customerRepository.updateLifecycleState(followUp.customerId, 'Lost');
      }
    } catch (error) {
      console.error(`Error executing recovery step ${followUp.id}:`, error);
    }
  }

  private async generateRecoveryContent(followUp: FollowUp): Promise<string> {
    const conversation = await conversationRepository.findActiveByCustomer(followUp.customerId);
    let history = '';
    if (conversation) {
      const messages = await conversationRepository.getMessages(conversation.id);
      history = messages.map(m => `${m.sender}: ${m.content}`).join('\n');
    }

    const provider = LLMProviderFactory.getProvider();
    const prompt = `You are a helpful front-desk assistant recovery engine.
${history ? `Chat history:\n${history}\n` : 'No prior chat history.'}
Follow-up type: ${followUp.type} (re_engagement = 15 min, day_1 = 24 hr, day_3 = 72 hr)
Write a short, professional 1-2 sentence re-engagement message. Keep it casual and supportive.`;

    return await provider.chat([
      { role: 'system', content: 'You are an AI recovery dispatcher.' },
      { role: 'user', content: prompt },
    ]);
  }

  private defaultSequence(): RecoveryStep[] {
    return [
      { type: 're_engagement', delayMinutes: 15, channel: 'web_chat' },
      { type: 'day_1', delayHours: 24, channel: 'web_chat' },
      { type: 'day_3', delayHours: 72, channel: 'web_chat' },
    ];
  }

  async cancelRecovery(customerId: string): Promise<void> {
    await followUpRepository.cancelPending(customerId);
  }
}
```

---

### Task 6: Missed Call Handler

**Files:**
- Create: `backend/src/services/recovery/missed-call.handler.ts`

```typescript
import pool from '../../config/db';
import { customerRepository } from '../../repositories';
import { RecoveryService } from './recovery.service';

export class MissedCallHandler {
  constructor(private recoveryService: RecoveryService) {}

  async processMissedCalls(): Promise<number> {
    const query = `
      SELECT vc.id, vc.business_id, vc.customer_id
      FROM voice_calls vc
      WHERE vc.direction = 'inbound'
        AND vc.call_status = 'missed'
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
        await this.recoveryService.scheduleRecovery(row.customer_id, row.business_id, 'missed_call');
        processed++;
      } catch (err) {
        console.error(`Missed call recovery failed for ${row.id}:`, err);
      }
    }

    return processed;
  }
}
```

---

### Task 7: Recovery Config Controller & Routes

**Files:**
- Create: `backend/src/controllers/recovery.controller.ts`
- Modify: `backend/src/routes/api.routes.ts`

**recovery.controller.ts:**
```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/db';

export class RecoveryController {
  async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({ businessId: z.string().uuid() });
      const { businessId } = schema.parse(req.query);
      const query = `SELECT appointment_settings->'recoveryConfig' as recovery_config FROM businesses WHERE id = $1`;
      const result = await pool.query(query, [businessId]);
      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }
      res.status(200).json({ success: true, data: result.rows[0].recovery_config });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        businessId: z.string().uuid(),
        recoveryConfig: z.object({
          inactivityTimeoutMinutes: z.number().min(1).max(1440),
          sequences: z.record(z.array(z.object({
            type: z.enum(['re_engagement', 'day_1', 'day_3', 'missed_call']),
            delayMinutes: z.number().optional(),
            delayHours: z.number().optional(),
            channel: z.enum(['web_chat', 'whatsapp', 'voice', 'sms']),
          }))),
        }),
      });
      const parsed = schema.parse(req.body);
      const query = `
        UPDATE businesses
        SET appointment_settings = jsonb_set(
          COALESCE(appointment_settings, '{}'::jsonb),
          '{recoveryConfig}',
          $2::jsonb
        )
        WHERE id = $1
        RETURNING appointment_settings->'recoveryConfig' as recovery_config
      `;
      const result = await pool.query(query, [parsed.businessId, JSON.stringify(parsed.recoveryConfig)]);
      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }
      res.status(200).json({ success: true, data: result.rows[0].recovery_config });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const recoveryController = new RecoveryController();
```

**Routes updates** (api.routes.ts):
```typescript
import { recoveryController } from '../controllers/recovery.controller';

// Section 6. Recovery Engine
router.get('/recovery/config', (req, res) => recoveryController.getConfig(req, res));
router.put('/recovery/config', (req, res) => recoveryController.updateConfig(req, res));
```

---

### Task 8: Update Follow-Up Repository

**Files:**
- Modify: `backend/src/repositories/followup.repository.ts`

Update `schedule()` to include new columns:
```typescript
async schedule(data: {
  customerId: string;
  businessId: string;
  type: FollowUpType;
  scheduledAt: Date;
  channel?: string;
  triggerReason?: string;
  attemptNumber?: number;
  metadata?: Record<string, any>;
}): Promise<FollowUp> {
  const query = `
    INSERT INTO follow_ups (customer_id, business_id, type, channel, trigger_reason, attempt_number, scheduled_at, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const res = await pool.query(query, [
    data.customerId,
    data.businessId,
    data.type,
    data.channel || 'web_chat',
    data.triggerReason || 'inactivity',
    data.attemptNumber || 1,
    data.scheduledAt,
    JSON.stringify(data.metadata || {}),
  ]);
  return this.mapToEntity(res.rows[0]);
}
```

Update `mapToEntity` to include new fields.

Also add `findByCustomer()`:
```typescript
async findByCustomer(customerId: string): Promise<FollowUp[]> {
  const query = `SELECT * FROM follow_ups WHERE customer_id = $1 ORDER BY scheduled_at DESC`;
  const res = await pool.query(query, [customerId]);
  return res.rows.map(r => this.mapToEntity(r));
}
```

---

### Task 9: Update Cron Controller

**Files:**
- Modify: `backend/src/controllers/cron.controller.ts`

Replace the old FollowUpService call with the new RecoveryService + MissedCallHandler:
```typescript
import { recoveryService } from '../services/recovery/recovery.service';
import { MissedCallHandler } from '../services/recovery/missed-call.handler';

export class CronController {
  async triggerFollowUps(req: Request, res: Response): Promise<void> {
    try {
      const missedCallHandler = new MissedCallHandler(recoveryService);

      const abandoned = await recoveryService.detectAbandonedConversations();
      const missedCallRecoveries = await missedCallHandler.processMissedCalls();
      const processed = await recoveryService.processDueRecoveries();

      res.status(200).json({
        success: true,
        message: `Recovery routine executed. Abandoned: ${abandoned}, Missed calls: ${missedCallRecoveries}, Processed: ${processed}`,
        counts: { abandoned, missedCallRecoveries, processed },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
```

---

### Task 10: Update ChatService

**Files:**
- Modify: `backend/src/services/chat.service.ts`

Replace:
- `followUpRepository.cancelPending(customer.id)` → `recoveryService.cancelRecovery(customer.id)`
- Follow-up scheduling block → `recoveryService.scheduleRecovery(customer.id, input.businessId, 'inactivity')`

---

### Task 11: Update Services Index

**Files:**
- Modify: `backend/src/services/index.ts`

Remove old follow-up export, add recovery exports:
```typescript
export * from './recovery/recovery.service';
export * from './recovery/abandonment-detector';
export * from './recovery/missed-call.handler';
export * from './recovery/index';
```

---

### Task 12: Frontend Updates

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`

Sync types and add recovery config API functions.
