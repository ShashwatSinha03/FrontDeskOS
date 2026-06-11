CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_business
  ON notifications(business_id);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(business_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_created
  ON notifications(created_at DESC);

ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
