# Delivery Architecture Audit

## 1. Current Message Lifecycle

```
Customer sends message via POST /api/chat
  → ChatController.handleMessage()
    → ChatService.handleIncomingMessage()
      → customerRepository.findByChannelIdentity()
      → conversationRepository.findActiveByCustomer() / create()
      → conversationRepository.addMessage()      [persist customer message]
      → recoveryService.cancelRecovery()
      → businessRepository.findById() + fetchServices() + getMessages()
      → conversationAgent.invoke()              [AI generates reply]
      → customerRepository.updateLifecycleState()
      → recoveryService.scheduleRecovery()
      → conversationRepository.addMessage()      [persist agent reply]
      → channelRegistry.getAdapterForBusiness()
      → adapter.sendMessage()                    [delivery attempt]
      → return ChatResponse to controller
  → HTTP 200 with replyMessage
```

## 2. Current Delivery Mechanism

| Step | What Happens |
|------|-------------|
| Persist | `conversationRepository.addMessage()` inserts into `messages` table |
| Resolve adapter | `channelRegistry.getAdapterForBusiness()` returns adapter by channelType |
| Send | `adapter.sendMessage()` — `WebChatAdapter` returns `{ success: true }` immediately |
| Result | No tracking, no logging, no status recording |

**For web_chat:** Delivery is the HTTP response. The adapter is a no-op.

**For WhatsApp/Voice/SMS:** Adapters throw "not yet implemented" — but the error is caught and logged, and the conversation proceeds normally.

## 3. Delivery Gaps

### Gap 1: No Delivery Tracking

There is no `message_deliveries` table. After `sendMessage()` returns, there is no record of:
- Whether the message was sent
- When it was sent
- What provider handled it
- What external ID was assigned
- What went wrong if it failed

### Gap 2: ChatService Has Two Responsibilities

ChatService currently:
1. Orchestrates conversation logic (customer resolution, agent invocation, lifecycle)
2. Handles delivery (resolves adapter, calls sendMessage)

These should be separated. ChatService should call a `DeliveryService` that manages the delivery lifecycle.

### Gap 3: No Retry Mechanism

If a delivery fails (network error, provider down, rate limit), the current code:
1. Catches the error in ChatService
2. Logs "Channel delivery failed"
3. Returns success to the user

There is no retry queue, no backoff, no dead-letter handling.

### Gap 4: Adapters Are Registered But Not Ready

| Adapter | Registered | sendMessage | Status |
|---------|-----------|-------------|--------|
| WebChatAdapter | ✅ | Returns `{ success: true }` | Works |
| WhatsAppAdapter | ✅ | Throws | Cannot send |
| VoiceAdapter | ✅ | Throws | Cannot send |
| SmsAdapter | ✅ | Throws | Cannot send |

When WhatsApp is integrated, the adapter will make an external API call. There's no infrastructure to:
- Record the attempt
- Handle partial failures
- Retry on transient errors

### Gap 5: No Analytics Data

Without delivery records, there's no way to:
- Calculate delivery success rate
- Track delivery latency
- Monitor provider reliability
- Alert on delivery failures

## 4. Failure Points

| Point | Impact | Current Handling |
|-------|--------|-----------------|
| Adapter not found | `getAdapterForBusiness` throws | Caught in ChatService, logged, conversation continues |
| Adapter.sendMessage fails | Delivery fails | Caught in ChatService, logged, conversation continues |
| DB write fails | Message not persisted | Throws up to controller → 500 error |
| Provider rate limit | Delivery delayed | No handling |
| Provider downtime | Delivery fails | No retry |

**Key property:** Delivery failures never break conversations. This is correct and must be preserved.

## 5. Retry Requirements

For future WhatsApp integration:
- **Transient failures** (network timeout, 429 rate limit, 500 server error) → retry with backoff
- **Permanent failures** (invalid phone number, unregistered opt-in) → mark failed, no retry
- **Max retries:** 3-5 attempts
- **Backoff:** Exponential (30s, 2min, 5min, 15min, 30min)
- **Dead-letter:** After max retries, mark permanently failed, alert operator

## 6. Future WhatsApp Requirements

| Requirement | Current | Needed |
|------------|---------|--------|
| Delivery tracking | ❌ Missing | `message_deliveries` table |
| Status callbacks | ❌ Missing | Webhook to receive `sent`/`delivered`/`read`/`failed` |
| Retry logic | ❌ Missing | RetryPolicy + DeliveryJob interfaces |
| Provider credential resolution | ✅ In `business_channels.config_json` | Already stored |
| Template message support | ❌ Missing | Template resolution before sending |
| Media upload | ❌ Missing | Media handling before send |

## 7. Summary

| Component | Status | Action Required |
|-----------|--------|----------------|
| Message persistence | ✅ Done | No changes |
| Channel adapter interface | ✅ Done | No changes |
| Adapter registration | ✅ Done | No changes |
| ChatService delivery call | ⚠️ Basic | Replace with DeliveryService |
| Delivery tracking | ❌ Missing | New table + repository |
| Delivery service | ❌ Missing | New service layer |
| Retry infrastructure | ❌ Missing | New interfaces |
| Analytics readiness | ❌ Missing | New helper methods |
| WebChatAdapter | ⚠️ No-op | Upgrade to return proper results |
