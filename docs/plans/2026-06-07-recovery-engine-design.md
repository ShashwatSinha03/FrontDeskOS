# Recovery Engine — Design Document

## Overview
Replace the existing rigid follow-up system with a configurable Recovery Engine that detects abandoned conversations, runs customizable recovery sequences through channel adapters (web_chat, WhatsApp, voice, SMS), handles missed-call recovery, and supports per-business configuration.

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Cron Endpoint                           │
│  POST /cron/follow-ups                                         │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                     RecoveryService                            │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ detectAbandoned │  │ processDueSteps   │  │ schedule     │  │
│  │ Conversations() │  │ ()                │  │ Recovery()   │  │
│  └────────┬────────┘  └────────┬─────────┘  └──────┬───────┘  │
│           │                    │                    │          │
└───────────┼────────────────────┼────────────────────┼──────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌───────────────────┐  ┌────────────────┐  ┌────────────────────┐
│ Abandonment       │  │ RecoveryChannel│  │ MissedCallHandler  │
│ Detector          │  │ Adapters       │  │                    │
│                   │  │ ┌────────────┐ │  │ - Scans voice_calls│
│ - Scans active    │  │ │WebChat     │ │  │ - Creates missed   │
│   conversations   │  │ │Channel     │ │  │   call recovery    │
│ - Checks inacti-  │  │ ├────────────┤ │  └────────────────────┘
│   vity timeout    │  │ │WhatsApp    │ │
│ - Respects life-  │  │ │(placeholder)│ │
│   cycle state     │  │ ├────────────┤ │
│                   │  │ │Voice/SMS   │ │
│                   │  │ │(placeholder)│ │
│                   │  │ └────────────┘ │
└───────────────────┘  └────────────────┘
```

## Database Schema Changes

### Enhance `follow_ups` table
```sql
ALTER TABLE follow_ups
  ADD COLUMN channel VARCHAR(50) NOT NULL DEFAULT 'web_chat',
  ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN trigger_reason VARCHAR(50) NOT NULL DEFAULT 'inactivity',
  ADD COLUMN attempt_number INT NOT NULL DEFAULT 1,
  ADD COLUMN resolved_at TIMESTAMPTZ;
```

### Add `recovery_settings` to `businesses`
Append to the existing `appointment_settings` JSONB, or as a sibling:
```json
{
  "inactivityTimeoutMinutes": 10,
  "sequences": {
    "default": [
      { "type": "re_engagement", "delayMinutes": 15, "channel": "web_chat" },
      { "type": "day_1", "delayHours": 24, "channel": "web_chat" },
      { "type": "day_3", "delayHours": 72, "channel": "web_chat" }
    ],
    "missed_call": [
      { "type": "missed_call", "delayMinutes": 5, "channel": "whatsapp" },
      { "type": "day_1", "delayHours": 24, "channel": "web_chat" }
    ]
  }
}
```

## Types (backend/src/types/index.ts)

```typescript
export type FollowUpType = 're_engagement' | 'day_1' | 'day_3' | 'missed_call';
export type FollowUpChannel = 'web_chat' | 'whatsapp' | 'voice' | 'sms';
export type FollowUpTriggerReason = 'inactivity' | 'missed_call' | 'booking_no_show' | 'manual';

export interface RecoveryConfig {
  inactivityTimeoutMinutes: number;
  sequences: Record<string, RecoveryStep[]>;
}

export interface RecoveryStep {
  type: FollowUpType;
  delayMinutes?: number;
  delayHours?: number;
  channel: FollowUpChannel;
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

## Services

### RecoveryService (replaces FollowUpService)

| Method | Responsibility |
|---|---|
| `detectAbandonedConversations()` | Scans for inactive conversations, creates recovery sequences |
| `processDueRecoveries()` | Finds pending/ due follow_ups, routes through channel adapters |
| `scheduleRecovery(customerId, businessId, reason)` | Creates sequence steps from business config |
| `cancelRecovery(customerId)` | Cancels all pending steps for a customer |
| `triggerMissedCallRecovery(voiceCallId)` | Creates recovery for a missed call |
| `registerChannel(channel)` | Registers a channel adapter |

### Channel Adapters

| Adapter | Status |
|---|---|
| `WebChatChannel` | Active — logs messages into conversation transcript |
| `WhatsAppChannel` | Placeholder — interface implemented, `send()` throws descriptive error |
| `SmsChannel` | Placeholder |
| `VoiceChannel` | Placeholder |

### AbandonmentDetector
1. Query active conversations with no message in > `inactivityTimeoutMinutes`
2. Exclude customers in terminal states (Booked, Customer, Escalated, Lost)
3. Check no existing pending recovery for this customer
4. Create recovery sequence via RecoveryService

### MissedCallHandler
1. Query `voice_calls` where direction=inbound, call_status=missed, not yet recovered
2. Resolve customer via `customer_channels` (phone number match)
3. Create missed_call recovery sequence

## API Routes

| Method | Path | Change |
|---|---|---|
| `POST` | `/cron/follow-ups` | Now calls detectAbandoned + processDueRecoveries |
| `GET` | `/follow-ups` | Enhanced filters (channel, triggerReason) |
| `POST` | `/follow-ups/:id/cancel` | Unchanged |
| `GET` | `/recovery/config?businessId=...` | New — get recovery config |
| `PUT` | `/recovery/config` | New — update recovery config |

## ChatService Changes
- `followUpRepository.cancelPending()` → `recoveryService.cancelRecovery()`
- Follow-up scheduling → `recoveryService.scheduleRecovery()` (uses business config)

## Implementation Order
1. Database migration (ALTER TABLE + recovery_settings support)
2. TypeScript types (RecoveryChannel, RecoveryConfig, enhanced FollowUp)
3. RecoveryChannel interface + WebChatChannel + placeholder adapters
4. AbandonmentDetector service
5. RecoveryService (replaces FollowUpService)
6. MissedCallHandler
7. Update cron controller (use RecoveryService)
8. Recovery config controller/routes
9. Update ChatService (use RecoveryService)
10. Update follow-up repository (handle new columns)
11. Frontend types sync + API client updates
