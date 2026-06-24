-- Migration: Add llm_usage and channel_usage tables for cost telemetry
-- Part of the Usage & Cost Telemetry Sprint

-- ==========================================
-- 1. LLM Usage Table
-- ==========================================
CREATE TABLE IF NOT EXISTS llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd DECIMAL(12, 8) NOT NULL DEFAULT 0,
  context VARCHAR(50), -- intent_detection, booking, information, pricing, etc.
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_business_created
  ON llm_usage(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_usage_conversation
  ON llm_usage(conversation_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_created
  ON llm_usage(created_at DESC);

-- ==========================================
-- 2. Channel Usage Table
-- ==========================================
CREATE TABLE IF NOT EXISTS channel_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  channel_type channel_type NOT NULL,
  direction VARCHAR(20) NOT NULL DEFAULT 'outbound',
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  estimated_cost_usd DECIMAL(12, 8) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channel_usage_business_created
  ON channel_usage(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_usage_business_channel
  ON channel_usage(business_id, channel_type);
CREATE INDEX IF NOT EXISTS idx_channel_usage_created
  ON channel_usage(created_at DESC);

-- Enable RLS on new tables (service_role bypasses, but consistent with other tables)
ALTER TABLE llm_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for founder access (service_role used by backend, these are for Supabase direct access)
CREATE POLICY founder_read_llm_usage ON llm_usage
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE staff_profiles.user_id = auth.uid()
        AND staff_profiles.business_id = llm_usage.business_id
        AND staff_profiles.role IN ('owner', 'admin')
    )
  );

CREATE POLICY founder_read_channel_usage ON channel_usage
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE staff_profiles.user_id = auth.uid()
        AND staff_profiles.business_id = channel_usage.business_id
        AND staff_profiles.role IN ('owner', 'admin')
    )
  );

-- Trigger for updated_at on both tables
CREATE TRIGGER set_timestamp_llm_usage
  BEFORE UPDATE ON llm_usage
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_channel_usage
  BEFORE UPDATE ON channel_usage
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
