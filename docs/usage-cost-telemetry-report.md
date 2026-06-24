# Usage & Cost Telemetry Report

**Date:** 2026-06-24
**Verdict:** TELEMETRY READY

## Summary

Complete usage and cost telemetry layer built across all 13 LLM invocation sites and all message delivery channels. Zero billing infrastructure — telemetry only.

## Scope

| Priority | Description | Status |
|----------|-------------|--------|
| P1 | LLM Usage Audit | DONE |
| P2 | Interface extension (`LLMResponse` with usage) | DONE |
| P3 | Database migrations (`llm_usage` + `channel_usage`) | DONE |
| P4 | Persist LLM usage at all 13 invocation sites | DONE |
| P5 | Cost estimation layer | DONE |
| P6 | Channel usage tracking | DONE |
| P7 | Founder cost dashboard | DONE |
| P8 | Usage summary service | DONE |
| P9 | Pricing simulation engine | DONE |
| P10 | Founder analytics (top businesses, expensive) | DONE |
| P11 | TypeScript verification | PASS |
| P12 | Regression audit + report | DONE |

## What Was Built

### 1. Database Tables
- **`llm_usage`** — per-call LLM token usage and estimated cost, tagged with business/conversation/customer/context
- **`channel_usage`** — per-message channel delivery cost, tagged with business/conversation/channel type
- Both have RLS policies for founder/owner access and appropriate indexes

### 2. LLM Provider Changes
- `ILLMProvider.chat()` return type changed from `Promise<string>` → `Promise<LLMResponse>`
- `LLMResponse` contains `content`, `usage` (input/output/total tokens), and `model` name
- All 3 providers (Groq, OpenAI, Anthropic) extract `usage_metadata` from LangChain `AIMessage`
- Backward incompatible — all call sites updated

### 3. LLM Usage Persistence (13 sites)
- 10 LangGraph agent nodes (intent detection + 9 handler nodes)
- Escalation pre-detector
- Follow-up content generation
- Recovery content generation

### 4. Channel Usage Tracking
- `deliveryService.sendMessage()` now persists channel usage on successful delivery
- Cost estimated per channel type (web_chat: $0, whatsapp: $0.005, voice: $0.013, sms: $0.0079)

### 5. Cost Estimator
- Provider-specific pricing (Groq: $0.05/$0.08 per 1M tokens, OpenAI: $2.50/$10.00, Anthropic: $3.00/$15.00)
- Channel-specific per-message costs
- Returns estimated cost in USD (8 decimal places)

### 6. Backend Endpoints
| Route | Description |
|-------|-------------|
| `GET /ops/costs/summary` | Platform-wide cost aggregation |
| `GET /ops/costs/llm` | LLM cost breakdown (by provider, context, daily) |
| `GET /ops/costs/channels` | Channel cost summary |
| `GET /ops/costs/llm/:businessId` | Per-business LLM usage detail |
| `GET /ops/costs/simulate` | Pricing simulation calculator |
| `GET /ops/costs/analytics` | Founder analytics (top expensive/volume businesses) |

### 7. Frontend — Founder Cost Dashboard (`/ops/costs`)
- 4 stat cards (monthly cost, call volume, cost/business, LLM share)
- LLM cost by provider (horizontal bars)
- Channel cost by type (horizontal bars)
- Top 20 businesses by total cost (ranked table)
- Daily LLM cost sparkline chart (30 days)

### 8. Pricing Simulation Engine
- API endpoint with configurable inputs: businesses, conversations, LLM calls, messages, target margin
- Outputs: monthly costs, recommended price, breakeven point, gross margin

## Key Design Decisions

- **Non-blocking**: All usage persistence is fire-and-forget with `.catch()` — failure to log never breaks chat
- **Tenant-aware**: Every record tagged with `business_id` for multi-tenant cost attribution
- **Tenant-safe**: All database queries filtered by business_id; service_role bypasses RLS
- **No new dependencies**: Uses existing `pool` (pg) for all inserts
- **All TypeScript passing**: `npx tsc --noEmit` on both backend and frontend — zero errors

## Next Steps (not in scope)
- Aggregate usage summaries into `businesses` table (plan_tier, billing_status)
- Stripe/Razorpay subscription management and payment collection
- Plan enforcement and usage-based billing
- Invoice generation and payment receipts
