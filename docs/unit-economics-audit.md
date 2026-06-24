# Nuvora — Unit Economics & Billing Readiness Audit

**Date**: 2026-06-21
**Auditor**: opencode
**Status**: COMPLETE
**Methodology**: Codebase exploration, schema analysis, cost estimation, gap identification. No implementation.

---

## Executive Summary

Nuvora has **zero billing infrastructure**. There are no plan tiers, no subscription models, no payment integration, no usage tracking, and no cost attribution. The founder's manual confirms: *"Billing: Does not exist. Zero revenue collection. Cannot charge clients."*

However, the **data layer is surprisingly ready** for per-business usage metering. Conversations, messages, deliveries, appointments, and escalations are all stored with `business_id` foreign keys. What's missing is the aggregation layer (no SQL queries counting these per business for billing) and the LLM cost tracking (no token usage capture).

**Verdict**: ADDITIONAL BILLING INFRASTRUCTURE REQUIRED — but the gap is bridgeable with moderate engineering effort.

---

## Part 1 — Cost Inventory

### 1.1 LLM Costs

| Provider | Status | Model | Estimated Cost per 1M Tokens | Monthly Est. (pilot scale) |
|---|---|---|---|---|
| **Groq** (active) | Live | `llama-3.1-8b-instant` | ~$0.05/M input, ~$0.08/M output | ~$2-5/month |
| **OpenAI** (configured) | Idle (key present) | `gpt-4o` | ~$2.50/M input, ~$10.00/M output | ~$50-200/month |
| **Anthropic** (configured) | Idle (no key) | `claude-3-5-sonnet-20240620` | ~$3.00/M input, ~$15.00/M output | N/A |

**13 LLM call sites** across the agent graph (agent.nodes.ts:284-969) and services (escalation-detector, recovery, followup). Every incoming customer message triggers 1-3 LLM calls depending on intent routing.

**Cost basis**: At current Groq pricing with `llama-3.1-8b-instant` (~$0.10/M total tokens), a typical conversation (5-10 messages) costs approximately **$0.001-0.003 per conversation**. At pilot scale (50-100 businesses, ~100 conversations/day), estimated monthly LLM cost: **$3-9/month**.

### 1.2 WhatsApp / Twilio Costs

| Component | Status | Estimated Cost |
|---|---|---|
| Twilio Account SID | Not configured in live .env | $0/month (inactive) |
| Twilio Auth Token | Not configured in live .env | $0/month (inactive) |
| WhatsApp messaging | Adapter exists, not configured | $0.005/outbound msg (US) |
| Twilio phone number | Not provisioned | $0/month |
| **Web Chat** (current primary channel) | Active, no external cost | $0/msg |

**Cost basis**: Web chat is the primary channel and has zero per-message cost. WhatsApp would cost approximately $0.005 per outbound message (US rates) + $0.00 per inbound message (free). At ~10 outbound messages per conversation × 100 conversations/day = 1000 msgs/day × 30 days = 30,000 msgs/month × $0.005 = **$150/month** if WhatsApp is fully deployed.

### 1.3 Infrastructure Costs

| Component | Plan | Monthly Cost | Spans Businesses? |
|---|---|---|---|
| **Render** (backend) | Starter ($7/month, Oregon) | $7 | All businesses share one instance |
| **Supabase** (database) | Free tier (or launch plan) | $0-25 | All businesses share one DB |
| **Vercel** (frontend) | Free tier (Hobby) | $0 | All businesses share one deployment |
| **Sentry** (monitoring) | Not configured (no DSN) | $0 | N/A |

**Total fixed infrastructure cost**: **$7-32/month**

### 1.4 Other Costs

| Component | Status | Cost |
|---|---|---|
| Email service | Not integrated | $0 |
| File storage | Not configured (Supabase storage not used) | $0 |
| Monitoring (Datadog, etc.) | None beyond Sentry stub | $0 |
| Domain / DNS | Not audited (assume ~$10-15/yr) | ~$1/month |

### 1.5 Per-Business Cost Summary (Pilot Scale)

| Cost Component | Fixed (total) | Variable (per active business) |
|---|---|---|
| Infrastructure (Render + Supabase + Vercel) | $7-32/month | $0 |
| LLM (Groq, llama-3.1-8b-instant) | $0 | ~$0.03-0.10/month |
| WhatsApp (if enabled) | $0 | ~$1.50-3.00/month |
| **Total per business at pilot** | **$7-32 shared across all businesses** | **~$1.50-3.10/month** |

At 20 active businesses: ~$0.35-1.60/business/month fixed + ~$1.50-3.10 variable = **~$1.85-4.70/business/month**.

---

## Part 2 — Usage Tracking Audit

### 2.1 What IS Tracked Per Business

| Metric | Table | Column | Tracked? | Aggregate Query Exists? |
|---|---|---|---|---|
| **Conversations** | `conversations` | `business_id` | ✅ Yes | ✅ Yes (inbox, founder, dashboard controllers) |
| **Messages (total)** | `messages` | `business_id` | ✅ Yes | ❌ No aggregate query exists |
| **Messages (inbound)** | `messages` | `sender = 'customer'` | ✅ Yes | ❌ No aggregate query exists |
| **Messages (outbound)** | `messages` | `sender = 'agent' \| 'human_owner'` | ✅ Yes | ❌ No aggregate query exists |
| **Deliveries** | `message_deliveries` | `business_id` | ✅ Yes | ✅ Yes (delivery-analytics.ts, operational.controller) |
| **Appointments** | `appointments` | `business_id` | ✅ Yes | ✅ Yes (analytics, dashboard controllers) |
| **Escalations** | `escalations` | `business_id` | ✅ Yes | ✅ Yes (inbox, analytics, founder controllers) |
| **Leads/Customers** | `customers` | `business_id` | ✅ Yes | ✅ Yes (analytics, dashboard controllers) |
| **Active channels** | `business_channels` | `business_id` | ✅ Yes | ❌ No aggregate query exists (but can count enabled) |
| **Staff/seats** | `staff_profiles` | `business_id` | ✅ Yes | ❌ No aggregate query exists (but can count by role/status) |
| **LLM token usage** | ❌ N/A | ❌ N/A | ❌ NOT TRACKED | ❌ N/A |
| **API request count** | ❌ N/A | ❌ N/A | ❌ NOT TRACKED | ❌ N/A |

### 2.2 Available Metrics via Existing Endpoints

```typescript
// analytics.controller.ts
GET /api/analytics/overview     → leads (total/qualified/won/lost/conversionRate)
                                → appointments (total/completed/cancelled/completionRate)
                                → escalations (total/resolved/resolutionRate)

// analytics.controller.ts
GET /api/analytics/services     → per-service: bookings, completed, cancelled
GET /api/analytics/trends       → daily: leads, appointments over 7/30/90 days
GET /api/analytics/funnel       → funnel: new, contacted, qualified, won, lost

// dashboard.controller.ts
GET /api/dashboard/summary      → lead state breakdown, pending escalations, appts today

// operational.controller.ts
GET /api/operate/deliveries/health  → total, successful, failed, delivery_rate, channel breakdown
GET /api/operate/activity           → recent activity feed

// inbox.controller.ts
GET /api/inbox/metrics          → escalation metrics: total, resolved, unresolved, 
                                  returned_to_ai_count, avg first response time, avg resolution time
```

### 2.3 Critical Gaps

1. **No message volume summary endpoint** — `SELECT sender, COUNT(*) FROM messages WHERE business_id = $1 GROUP BY sender` does not exist anywhere. This is the single most important metric for usage-based billing.
2. **No staff count per business** — `SELECT role, COUNT(*) FROM staff_profiles WHERE business_id = $1 GROUP BY role` does not exist.
3. **No channel count per business** — `SELECT COUNT(*) FROM business_channels WHERE business_id = $1 AND enabled = true` does not exist.
4. **No LLM token usage** — Not captured at any layer.

---

## Part 3 — Billing Readiness Audit

### 3.1 Schema Support for Per-Business Usage

| Usage Dimension | Current Schema | Can Query? | Ready for Billing? |
|---|---|---|---|
| Conversation count | `conversations (business_id)` | ✅ Direct COUNT query | ✅ Ready |
| Message count (inbound) | `messages (sender='customer')` | ✅ Direct COUNT query | ✅ Ready |
| Message count (outbound) | `messages (sender='agent'\|'human_owner')` | ✅ Direct COUNT query | ✅ Ready |
| Delivery count | `message_deliveries (business_id)` | ✅ Direct COUNT query with status filter | ✅ Ready |
| Appointment count | `appointments (business_id)` | ✅ Direct COUNT query with status filter | ✅ Ready |
| Escalation count | `escalations (business_id)` | ✅ Direct COUNT query | ✅ Ready |
| Lead count | `customers (business_id)` | ✅ Direct COUNT query | ✅ Ready |
| Active channel count | `business_channels (business_id)` | ✅ COUNT WHERE enabled = true | ✅ Ready |
| Staff/seat count | `staff_profiles (business_id)` | ✅ COUNT WHERE status = 'active' | ✅ Ready |
| LLM token usage | ❌ No table exists | ❌ Cannot query | ❌ Needs schema |
| API request volume | ❌ No table exists | ❌ Cannot query | ❌ Needs schema |

### 3.2 Schema Gaps for Billing

The `businesses` table is missing these columns that billing infrastructure would typically need:

| Missing Column | Purpose |
|---|---|
| `plan_tier` (VARCHAR) | Current pricing plan (starter, growth, enterprise) |
| `billing_status` (VARCHAR) | active, trialing, past_due, canceled, suspended |
| `stripe_customer_id` (VARCHAR) | Stripe payment customer reference |
| `stripe_subscription_id` (VARCHAR) | Stripe subscription reference |
| `trial_ends_at` (TIMESTAMPTZ) | Trial expiration date |
| `billing_cycle_start` (TIMESTAMPTZ) | Current billing period start |
| `max_staff` (INTEGER) | Seat limit for plan |
| `max_messages_monthly` (INTEGER) | Usage limit for plan |
| `features` (JSONB) | Feature flags for plan (e.g., `{"whatsapp": true, "analytics": false}`) |

### 3.3 Ops Pages for Billing

| Page | Current Content | Billing Support |
|---|---|---|
| `/ops` (Overview) | Total businesses, owners, staff | ❌ No billing metrics |
| `/ops/businesses` | List with name, slug, owner, status | ❌ No plan/status |
| `/ops/businesses/[id]` | Business info, owner, activity | ❌ No billing tab |
| `/ops/pilot/health` | Operational health per business | ❌ No billing status |

No billing pages, no billing navigation items, no billing analytics.

---

## Part 4 — Twilio Cost Attribution

### 4.1 Current State

The `whatsapp.adapter.ts` creates a Twilio client per message using per-business credentials from `business_channels.config_json`. Each message gets a `provider_message_id` (Twilio SID) stored in `message_deliveries`. The `deliveryStatusCallback` webhook receives delivery status updates.

```typescript
// whatsapp.adapter.ts:10-68
const accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID;
const authToken = config.authToken || process.env.TWILIO_AUTH_TOKEN;
const result = await twilio(accountSid, authToken).messages.create({
  from: `whatsapp:${whatsappNumber}`,
  to: `whatsapp:${customerPhone}`,
  body: content,
  statusCallback: `${WEBHOOK_BASE_URL}/api/webhooks/twilio/status?businessId=${businessId}&messageId=${messageId}`
});
```

### 4.2 Cost Attribution Capability

| Capability | Supported? | How |
|---|---|---|
| Track outbound messages per business | ✅ Yes | `message_deliveries` table has `business_id` |
| Track inbound messages per business | ✅ Yes | `messages` table with `sender = 'customer'` + channel type |
| Estimate per-message cost | ⚠️ Partial | Can multiply message count by Twilio rate, but rate varies by destination country |
| Query actual cost from Twilio API | ❌ No | No code fetches message pricing from Twilio's API |
| Attach cost to delivery record | ❌ No | `message_deliveries` has no `cost` column |
| Per-number cost breakdown | ⚠️ Partial | `business_channels.config_json` stores per-business Twilio credentials |

### 4.3 Cost Estimation Formula

```
Estimated WhatsApp cost per business = 
  (outbound_messages × $0.005) + 
  (inbound_messages × $0.00)
  
  where outbound_messages = COUNT(message_deliveries WHERE business_id = X AND status = 'sent')
```

**Accuracy**: Medium. Twilio WhatsApp rates vary by destination country ($0.005-$0.08/msg for US/India). Without querying actual Twilio billing records, estimates will be approximate.

### 4.4 Required Schema Changes for Accurate Attribution

```sql
ALTER TABLE message_deliveries ADD COLUMN cost_cents INTEGER;
ALTER TABLE message_deliveries ADD COLUMN cost_currency VARCHAR(3) DEFAULT 'USD';
```

Then fetch cost from Twilio API on status callback:
```typescript
const message = await twilioClient.messages(providerMessageId).fetch();
// message.price, message.priceUnit
```

---

## Part 5 — LLM Cost Attribution

### 5.1 Current State

**Zero token tracking exists.** The `ILLMProvider.chat()` method returns only the response text:

```typescript
// provider.interface.ts
interface ILLMProvider {
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<string>;
  // Returns string only — no usage metadata
}
```

None of the three provider implementations (Groq, OpenAI, Anthropic) capture or return token counts. The LangChain SDKs used by each provider DO return usage metadata in their raw responses, but the wrapper discards it.

### 5.2 LLM Cost Estimation (Current)

Without token tracking, the only estimation method is statistical:
```typescript
estimated_cost = (avg_input_tokens_per_call × input_cost_per_token + 
                  avg_output_tokens_per_call × output_cost_per_token) × 
                 number_of_calls
```

At current scale with Groq `llama-3.1-8b-instant` (~$0.10/M total tokens):
- Average conversation: 3 LLM calls × ~500 tokens each = 1500 tokens
- Cost per conversation: ~$0.00015
- Cost per 1000 conversations: ~$0.15

### 5.3 Required Schema for LLM Cost Tracking

```sql
CREATE TABLE llm_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  provider VARCHAR(50) NOT NULL,        -- 'groq', 'openai', 'anthropic'
  model VARCHAR(100) NOT NULL,           -- 'llama-3.1-8b-instant', 'gpt-4o', etc.
  node_name VARCHAR(100) NOT NULL,       -- 'detectIntent', 'informationNode', etc.
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cost_cents NUMERIC(10,6),             -- computed at log time
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_llm_usage_business ON llm_usage_logs(business_id, created_at);
CREATE INDEX idx_llm_usage_conversation ON llm_usage_logs(conversation_id);
```

### 5.4 Required Code Changes

1. **Modify `ILLMProvider.chat()`** to return `{ content: string, usage: { promptTokens, completionTokens, totalTokens } }`
2. **Modify each provider** (Groq, OpenAI, Anthropic) to extract usage from LangChain response
3. **Add logging** in `chat.service.ts` and `escalation-detector.service.ts` to write to `llm_usage_logs`
4. **Add cost computation** using a rate table (provider + model → cost per token)

### 5.5 Multi-Provider Cost Variability

| Provider | Model | Input Cost/M | Output Cost/M | Factor vs Groq |
|---|---|---|---|---|
| Groq | llama-3.1-8b-instant | $0.05 | $0.08 | 1x (baseline) |
| OpenAI | gpt-4o | $2.50 | $10.00 | ~50-125x |
| Anthropic | claude-3-5-sonnet | $3.00 | $15.00 | ~60-188x |

Switching from Groq to OpenAI/gpt-4o would increase per-conversation cost from ~$0.00015 to ~$0.01-0.02 — a **100x increase**. This makes LLM cost tracking critical if the provider ever changes from Groq.

---

## Part 6 — Multi-Tenant Provider Strategy

### 6.1 LLM Provider Isolation

| Concern | Current State | Risk |
|---|---|---|
| API key sharing | Single `GROQ_API_KEY` for all businesses | All businesses share quota |
| Rate limiting | 30 req/15min per IP+business combo | Mitigates abuse |
| Per-business model selection | Not supported | Same model for all |
| Isolation level | **None** — one key, one account | LLM costs cannot be attributed |

**Evidence**: `provider.factory.ts` returns a singleton provider based on `config.LLM_PROVIDER`. All businesses use the same API key, the same model, and the same rate limits.

**Recommendation**: For pilot, single-key sharing is acceptable. For commercial launch, implement per-business API key overrides in `businesses.config_json` or a new `llm_config` table.

### 6.2 WhatsApp / Twilio Provider Isolation

| Concern | Current State | Risk |
|---|---|---|
| Account SID | Per-business in `business_channels.config_json` | ✅ Properly isolated |
| Auth token | Per-business in `business_channels.config_json` | ✅ Properly isolated |
| Phone number | Per-business in `business_channels.config_json` | ✅ Properly isolated |
| Default fallback | Falls back to global env vars | ⚠️ If per-business not set, shares one number |
| Isolation level | **Good** — per-business credentials supported | ✅ Secure |

**Evidence**: `whatsapp.adapter.ts:15-22` reads credentials from per-business channel config first, falls back to global env vars. This supports multi-tenant Twilio with separate phone numbers.

**Recommendation**: Existing architecture is sound for Twilio. Require per-business credentials before enabling WhatsApp.

### 6.3 Infrastructure Isolation

| Concern | Current State | Risk |
|---|---|---|
| Backend instance | Single Render instance | All businesses share |
| Database | Single Supabase Postgres DB | ✅ RLS + business_id filtering |
| Frontend | Single Vercel deployment | All businesses share domain |
| Isolation level | **Logical** (by business_id) | ✅ Standard SaaS multi-tenant |

---

## Part 7 — Future Pricing Models

### 7.1 Fixed Monthly

| Aspect | Assessment |
|---|---|
| Implementation complexity | **Low** — Add `plan_tier` column to `businesses`, stripe subscription, gating logic |
| Operational complexity | **Low** — Simple, predictable billing |
| Margin visibility | **High** — Fixed costs known ($7-32/mo infra + LLM variable) |
| Revenue predictability | **High** — Monthly recurring revenue |
| Time to implement | ~2-4 weeks (Stripe integration, portal, plan table) |
| Recommended initial price | **$49-99/month** based on cost + value |

### 7.2 Fixed + Usage

| Aspect | Assessment |
|---|---|
| Implementation complexity | **Medium** — Fixed billing + usage metering + overage calculation |
| Operational complexity | **Medium** — Need to track usage, send alerts, handle overage disputes |
| Margin visibility | **Medium** — Variable costs (LLM, Twilio) can be passed through or absorbed |
| Revenue predictability | **Medium** — Base is predictable, usage varies |
| Time to implement | ~4-6 weeks |
| Recommended model | $29-49/month base + $0.10-0.25/conversation overage |

### 7.3 Tiered

| Aspect | Assessment |
|---|---|
| Implementation complexity | **Medium** — Multiple plan definitions, feature gating, upgrade/downgrade flow |
| Operational complexity | **Medium** — Managing tier transitions, proration |
| Margin visibility | **High** — Each tier has known cost profile |
| Revenue predictability | **High** — Tier-based MRR |
| Time to implement | ~4-8 weeks |
| Recommended tiers | **Starter** ($29/mo, 1 staff, web chat only, 500 convs/mo) → **Growth** ($79/mo, 5 staff, WhatsApp, 2000 convs/mo) → **Enterprise** ($199/mo, unlimited) |

### 7.4 Enterprise

| Aspect | Assessment |
|---|---|
| Implementation complexity | **Low** for custom pricing (just disable gating). **High** for SLA, SSO, dedicated infra |
| Operational complexity | **High** — Custom contracts, invoices, support |
| Margin visibility | **Case by case** — Requires individual cost analysis |
| Revenue predictability | **Low** — Infrequent, large deals |
| Time to implement | Custom per deal |

### 7.5 Recommended Initial Model

**Fixed Monthly ($49-79/mo)** for pilot-to-commercial transition. It's the simplest to implement, easiest to communicate, and aligns with the current cost structure where infrastructure is the dominant cost.

---

## Part 8 — Recommended Business Model

### 8.1 Cost Basis

From Part 1:
- **Fixed infrastructure cost**: $7-32/month (shared across all businesses)
- **Per-business variable cost**: $1.50-3.10/month (LLM + WhatsApp)
- **True cost per business at 20 tenants**: ~$1.85-4.70/month

### 8.2 Pricing Recommendation

| Component | Recommendation | Rationale |
|---|---|---|
| **Onboarding fee** | **$0** (free onboarding) | Cost to onboard is negligible (automated via /ops/onboarding). Waive to reduce friction. |
| **Monthly fee** | **$49-79/month** | Covers infrastructure ($0.35-1.60/business) + variable costs ($1.50-3.10) + healthy margin (10-20x). At 20 businesses: $980-1,580/mo revenue vs $37-94/mo costs = **90-97% gross margin**. |
| **Included usage** | **500 conversations/month** | At ~3 LLM calls/conversation × 500 avg tokens × $0.10/M tokens = $0.00015/conv. 500 conversations = $0.075 cost. Generous buffer. |
| **Overage model** | **$0.10/conversation** | Covers LLM + Twilio costs at scale. 1000 overage conversations = $0.15 cost → $100 revenue. |
| **WhatsApp add-on** | **+$20/month** | Covers Twilio number fee (~$1/mo) + message costs. Pure margin. |
| **Extra staff seats** | **+$15/month per seat** | No incremental cost (staff don't consume LLM tokens). Pure margin. |

### 8.3 Revenue Projection at Pilot Scale

| Scenario | Businesses | Monthly Fee | Monthly Revenue | Monthly Cost | Gross Margin |
|---|---|---|---|---|---|
| Early pilot | 10 | $49 | $490 | $32 infra + $20 LLM = $52 | **89%** |
| Growth | 25 | $59 | $1,475 | $32 infra + $60 LLM = $92 | **94%** |
| Scale | 100 | $79 | $7,900 | $32 infra + $310 LLM = $342 | **96%** |

### 8.4 Breakeven

At **2 paying businesses** at $49/month:
- Revenue: $98/month
- Costs: $32 infra + ~$4-6 LLM = ~$38/month
- **Breakeven: 2 businesses**

### 8.5 Key Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Switching from Groq to OpenAI | 100x LLM cost increase | Keep billing model, monitor profit margins |
| WhatsApp adoption at scale | $150/month at 30K msgs | Pass through as add-on ($20/mo flat) |
| Supabase scaling | ~$25-100/month at higher tiers | Account for in fixed monthly fee |
| Single Render instance failure | All businesses down | Add redundancy at $7-19/month |

---

## Part 9 — Required Infrastructure for Billing

### 9.1 Schema Changes (Minimum Viable)

```sql
-- 1. Add billing columns to businesses
ALTER TABLE businesses ADD COLUMN plan_tier VARCHAR(50) DEFAULT 'trial';
ALTER TABLE businesses ADD COLUMN billing_status VARCHAR(50) DEFAULT 'trialing';
ALTER TABLE businesses ADD COLUMN stripe_customer_id VARCHAR(255);
ALTER TABLE businesses ADD COLUMN stripe_subscription_id VARCHAR(255);
ALTER TABLE businesses ADD COLUMN trial_ends_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN billing_cycle_start TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE businesses ADD COLUMN max_staff INTEGER DEFAULT 1;
ALTER TABLE businesses ADD COLUMN max_monthly_conversations INTEGER DEFAULT 500;
ALTER TABLE businesses ADD COLUMN features JSONB DEFAULT '{}';

-- 2. LLM usage tracking (if switching from Groq or for accurate cost attribution)
CREATE TABLE llm_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  node_name VARCHAR(100) NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cost_cents NUMERIC(10,6),
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 9.2 New Aggregate Endpoints Required

| Endpoint | Purpose |
|---|---|
| `GET /api/billing/usage?businessId=X&from=Y&to=Z` | Monthly usage summary for billing |
| `GET /api/ops/billing/summary` | All businesses with plan, billing status, usage |
| `POST /api/ops/billing/update-plan` | Change a business's plan |
| `GET /api/billing/invoices` | Invoice list (after Stripe integration) |

### 9.3 New Aggregate Queries Required

```sql
-- Message volume per business (most critical missing query)
SELECT sender, COUNT(*) 
FROM messages 
WHERE business_id = $1 
  AND created_at >= $2 
  AND created_at < $3 
GROUP BY sender;

-- Usage summary for billing period
SELECT
  (SELECT COUNT(*) FROM conversations WHERE business_id = $1 AND created_at >= $2 AND created_at < $3) as conversations,
  (SELECT COUNT(*) FROM messages WHERE business_id = $1 AND sender = 'customer' AND created_at >= $2 AND created_at < $3) as inbound_messages,
  (SELECT COUNT(*) FROM messages WHERE business_id = $1 AND sender IN ('agent', 'human_owner') AND created_at >= $2 AND created_at < $3) as outbound_messages,
  (SELECT COUNT(*) FROM message_deliveries WHERE business_id = $1 AND created_at >= $2 AND created_at < $3) as deliveries,
  (SELECT COUNT(*) FROM appointments WHERE business_id = $1 AND created_at >= $2 AND created_at < $3) as appointments,
  (SELECT COUNT(*) FROM staff_profiles WHERE business_id = $1 AND status = 'active') as active_staff;
```

---

## Final Verdict

> **ADDITIONAL BILLING INFRASTRUCTURE REQUIRED** — The data layer supports per-business usage metering for conversations, messages, deliveries, appointments, escalations, and leads. However, LLM token tracking does not exist, the `businesses` table lacks billing columns, there is no payment integration, and no billing UI exists anywhere in the application. The gap is bridgeable with moderate engineering effort (estimated 2-4 weeks for minimum viable billing).

### Readiness Scorecard

| Category | Score | Notes |
|---|---|---|
| Cost inventory | ✅ Complete | $7-32/mo infra, ~$0.001-0.003/conv LLM |
| Usage tracking (non-LLM) | ✅ Ready | All business-scoped tables exist |
| Usage tracking (LLM) | ❌ Missing | No token counting, no usage table |
| Billing schema | ❌ Missing | No plan/tier/billing columns |
| Payment integration | ❌ Missing | No Stripe or any payment processor |
| Billing UI | ❌ Missing | No billing pages, nav items, or analytics |
| Twilio cost attribution | ⚠️ Partial | Message SIDs tracked, costs not stored |
| Multi-tenant isolation | ✅ Good | WhatsApp per-business creds, LLM shared (acceptable for pilot) |
| Margin visibility | ✅ High | Costs well understood, 89-96% gross margin projected |
| Breakeven | ✅ Excellent | 2 businesses at $49/mo covers all costs |
