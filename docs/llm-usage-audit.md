# LLM Usage Audit

**Date:** 2026-06-24
**Context:** Part of the Usage & Cost Telemetry Sprint

## Summary

Zero LLM token tracking exists. The `ILLMProvider.chat()` interface returns only `Promise<string>`, discarding all usage metadata (`input_tokens`, `output_tokens`, `total_tokens`) from LangChain responses. No database table stores LLM invocation cost data.

## Provider Coverage

Three LLM providers configured: Groq (`llama-3.1-8b-instant`, active), OpenAI (`gpt-4o`, idle), Anthropic (`claude-3-5-sonnet`, idle).

## All LLM Invocation Sites (13 total)

### 1. Intent Detection
- **File:** `backend/src/workflows/agent.nodes.ts` — `detectIntentNode` (line 285)
- **Purpose:** Classify customer message intent (greeting, booking, pricing, etc.)
- **Context available:** `state.business.id`, `state.customer.id`, `state.conversation.id`

### 2. Information Node
- **File:** `backend/src/services/workflows/agent.nodes.ts` — `informationNode` (line 344)
- **Purpose:** Answer general business questions using FAQs and context
- **Context available:** `state.business.id`, `state.customer.id`, `state.conversation.id`

### 3. Pricing Node
- **File:** `backend/src/workflows/agent.nodes.ts` — `pricingNode` (line 374)
- **Purpose:** Respond to pricing queries using service price ranges
- **Context available:** `state.business.id`, `state.customer.id`, `state.conversation.id`

### 4. Booking Node
- **File:** `backend/src/workflows/agent.nodes.ts` — `bookingNode` (line 478)
- **Purpose:** Collect booking details and create appointments
- **Context available:** `state.business.id`, `state.customer.id`, `state.conversation.id`

### 5. Reschedule Node
- **File:** `backend/src/workflows/agent.nodes.ts` — `rescheduleNode` (line 645)
- **Purpose:** Handle appointment rescheduling
- **Context available:** `state.business.id`, `state.customer.id`, `state.conversation.id`

### 6. Cancellation Node
- **File:** `backend/src/workflows/agent.nodes.ts` — `cancellationNode` (line 730)
- **Purpose:** Handle appointment cancellation
- **Context available:** `state.business.id`, `state.customer.id`, `state.conversation.id`

### 7. Escalation Node
- **File:** `backend/src/workflows/agent.nodes.ts` — `escalationNode` (line 819)
- **Purpose:** Generate escalation acknowledgement reply
- **Context available:** `state.business.id`, `state.customer.id`, `state.conversation.id`

### 8. Greeting Node
- **File:** `backend/src/workflows/agent.nodes.ts` — `greetingNode` (line 854)
- **Purpose:** Generate personalized greeting message
- **Context available:** `state.business.id`, `state.customer.id`, `state.conversation.id`

### 9. Unknown Node
- **File:** `backend/src/workflows/agent.nodes.ts` — `unknownNode` (line 891)
- **Purpose:** Handle unanswerable questions
- **Context available:** `state.business.id`, `state.customer.id`, `state.conversation.id`

### 10. Lead Capture Node
- **File:** `backend/src/workflows/agent.nodes.ts` — `leadCaptureNode` (line 966)
- **Purpose:** Collect customer contact information
- **Context available:** `state.business.id`, `state.customer.id`, `state.conversation.id`

### 11. Escalation Pre-Detector (pre-agent)
- **File:** `backend/src/services/escalation-detector.service.ts` — `detect` (line 98)
- **Purpose:** Classify whether message requires human escalation before invoking agent
- **Context available:** `input.businessId`

### 12. Follow-Up Content Generation
- **File:** `backend/src/services/followup.service.ts` — `executeSingleFollowUp` (line 93)
- **Purpose:** Generate personalized re-engagement message sequences
- **Context available:** `followUp.businessId`

### 13. Recovery Content Generation
- **File:** `backend/src/services/recovery/recovery.service.ts` — `generateRecoveryContent` (line 139)
- **Purpose:** Generate recovery/re-engagement message content
- **Context available:** `followUp.businessId`

## Request/Response Path (Current)

```
Call Site → LLMProviderFactory.getProvider() → provider.chat(messages, options)
  → Provider creates LangChain model → model.invoke(langChainMessages, callOptions)
  → LangChain returns AIMessage { content, usage_metadata }
  → Provider returns response.content (string) ONLY
  → Call site receives string, discarding usage_metadata
```

## Request/Response Path (Proposed)

```
Call Site → provider.chat(messages, options)
  → Provider extracts usage_metadata from AIMessage
  → Returns LLMResponse { content, usage: { inputTokens, outputTokens, totalTokens }, model }
  → Call site persists usage via usagePersistenceService (fire-and-forget)
  → Continue processing content as before
```

## Impact

- **No schema changes** other than new `llm_usage` table
- **No new dependencies** required
- **14 database writes** per conversation (1 intent + 1 handler node + optional pre-detector)
- **Non-blocking** — all DB writes are fire-and-forget, failure to log never breaks chat
- **~$0.0000013–0.00013 per invocation** depending on model (Groq: negligible, GPT-4o: ~$0.013)
