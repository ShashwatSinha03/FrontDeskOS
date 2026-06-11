CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_billing_events_subscription ON billing_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_business ON billing_events(business_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_created ON billing_events(created_at DESC);
