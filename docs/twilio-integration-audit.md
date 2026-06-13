# Twilio Integration Audit

## 1. Integration Points

| Point | Component | Status |
|-------|-----------|--------|
| Outbound API calls | `WhatsAppAdapter.sendMessage()` | Stub — throws |
| Inbound webhook | None | Missing — needs creation |
| Status callbacks | None | Missing — needs creation |
| Business credential storage | `business_channels.config_json` | Ready — schema exists |
| Customer resolution | `customerRepository.findByChannelIdentity('whatsapp', ...)` | Ready — generic |
| Conversation resolution | `conversationRepository.findActiveByCustomer()` | Ready — generic |
| ChatService invocation | `chatService.handleIncomingMessage()` | Ready — accepts channelType |
| Delivery tracking | `messageDeliveryRepository` | Ready — table + repository exist |
| Provider resolution | `DeliveryService.resolveProvider()` | Hardcoded — needs business-aware lookup |

## 2. Outbound Flow (Will Work After Adapter Implementation)

```
ChatService
  → deliveryService.sendMessage()        [async, non-blocking]
    → messageDeliveryRepository.createPending()
    → channelRegistry.getAdapter('whatsapp')
    → WhatsAppAdapter.sendMessage()
      → businessChannelRepository.getChannel(businessId, 'whatsapp')
      → extract Twilio credentials from config_json
      → twilioClient.messages.create({ from, to, body })
      → return { success, externalId: message.sid }
    → messageDeliveryRepository.markSent(id, businessId, externalId)
```

## 3. Inbound Flow (Will Work After Webhook Implementation)

```
Twilio → POST /api/webhooks/twilio/whatsapp
  → twilio.webhook.validateRequest()     [signature verification]
  → extract From (sender number)
  → extract To (business WhatsApp number)
  → extract Body (message content)
  → resolve business:
      businessChannelRepository.getChannelByWhatsappNumber(toNumber)
  → resolve customer:
      customerRepository.findByChannelIdentity('whatsapp', fromNumber, businessId)
      OR customerRepository.create() + linkChannel()
  → resolve conversation:
      conversationRepository.findActiveByCustomer(customerId, businessId)
      OR conversationRepository.create()
  → call chatService.handleIncomingMessage({
      businessId,
      channelType: 'whatsapp',
      channelIdentity: fromNumber,
      content: body,
    })
  → Twilio receives HTTP 200
  → AI reply is generated via existing ChatService
  → deliveryService.sendMessage() sends reply via WhatsAppAdapter
  → customer receives WhatsApp message
```

## 4. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Twilio credentials in DB | Plaintext in config_json | Use environment variables with single-account for MVP; encrypt for multi-tenant |
| Business resolution via phone number | Wrong business routing | Look up by `To` number from business_channels — explicit mapping |
| Webhook failures | Missed messages | Twilio retries for 24h; log failures |
| Rate limiting | Messages queued | Twilio handles queueing; monitor for 429s |
| Signature validation | Spoofed messages | `twilio.webhook.validateRequest()` with auth token |
| Adapter throws on send | Message persisted but not delivered | DeliveryService catches, marks failed, logs error |

## 5. Meta Compatibility

| Twilio Feature | Meta Equivalent | Impact |
|----------------|-----------------|--------|
| `twilioClient.messages.create()` | Meta Cloud API POST request | Different SDK, same adapter interface |
| Twilio webhook signature | Meta webhook verification token | Different validation, same webhook handler pattern |
| `MessageSid` | `wamid.XXX` | Both stored in `provider_message_id` |
| Status callbacks (queued/sent/delivered/failed) | Same statuses from Meta | Same `message_deliveries` update logic |
| Single Twilio number per business | Single Meta phone number per business | Same `business_channels.config_json` structure |

**Migration path:** Create `WhatsAppMetaAdapter` implementing the same `ChannelAdapter` interface. Swap in `ChannelRegistry`. No business logic changes needed.

## 6. Files to Create

| File | Purpose |
|------|---------|
| `services/channel/whatsapp.adapter.ts` | Full Twilio implementation |
| `services/channel/whatsapp-webhook.handler.ts` | Inbound message + status callback handler |
| `routes/webhook.routes.ts` | Webhook HTTP routes |
| `controllers/webhook.controller.ts` | Webhook controller |
| `docs/twilio-integration-audit.md` | This document |

## 7. Files to Modify

| File | Change |
|------|--------|
| `services/channel/delivery.service.ts` | Resolve provider from business_channels instead of hardcoding |
| `app.ts` | Mount webhook router before JSON body parser |
| Frontend settings page | Extend ChannelsTab for WhatsApp phone number config |
