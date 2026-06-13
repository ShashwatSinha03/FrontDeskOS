-- Nevura - Complete Supabase PostgreSQL Schema Definition
-- Supports: Multi-tenancy, Multi-channel mapping, Automated Lifecycle Logging, WhatsApp/Voice metadata, and Row-Level Security (RLS)

-- ==========================================
-- 1. EXTENSIONS & ENUMS
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customer Lifecycle States
CREATE TYPE customer_lifecycle_state AS ENUM (
  'New Inquiry',
  'Information Gathering',
  'Qualified',
  'Booking Opportunity',
  'Booked',
  'Customer',
  'Follow-Up Pending',
  'Escalated',
  'Lost'
);

-- Active channels supported
CREATE TYPE channel_type AS ENUM (
  'web_chat',
  'whatsapp',
  'voice'
);

-- Message Senders
CREATE TYPE message_sender AS ENUM (
  'customer',
  'agent',
  'human_owner',
  'system'
);

-- WhatsApp / Channel Message delivery statuses
CREATE TYPE message_delivery_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'read',
  'failed'
);

-- Appointment statuses
CREATE TYPE appointment_status AS ENUM (
  'pending',
  'confirmed',
  'cancelled',
  'rescheduled'
);

-- Escalation resolution statuses
CREATE TYPE escalation_status AS ENUM (
  'pending',
  'resolved'
);

-- Learning Inbox question states
CREATE TYPE knowledge_request_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- Follow-up sequence states
CREATE TYPE follow_up_status AS ENUM (
  'pending',
  'sent',
  'cancelled'
);

-- Follow-up message categories
CREATE TYPE follow_up_type AS ENUM (
  're_engagement',
  'day_1',
  'day_3',
  'missed_call'
);

-- ==========================================
-- 2. CORE SCHEMAS & TABLES
-- ==========================================

-- Businesses (Tenant Organization)
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  business_type VARCHAR(100) NOT NULL DEFAULT 'dental',
  archetype VARCHAR(100) NOT NULL DEFAULT 'standard_clinic',
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  description TEXT,
  logo_url TEXT,
  timezone VARCHAR(50) DEFAULT 'UTC',
  faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  escalation_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  appointment_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staff Profiles (Binds Supabase auth.users to specific businesses)
CREATE TABLE IF NOT EXISTS staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL, -- references auth.users(id) inside Supabase
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'staff', -- 'owner', 'staff', 'admin'
  full_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Services Table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_min DECIMAL(10, 2) NOT NULL,
  price_max DECIMAL(10, 2) NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT price_range_valid CHECK (price_min <= price_max),
  CONSTRAINT duration_positive CHECK (duration_minutes > 0)
);

-- Unified Customers Table (Supports tenant-isolation)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  lifecycle_state customer_lifecycle_state NOT NULL DEFAULT 'New Inquiry',
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Profile should contain at least a name or a communication handle
  CONSTRAINT profile_has_identity CHECK (
    name IS NOT NULL OR email IS NOT NULL OR phone IS NOT NULL
  )
);

-- Customer Sessions Table (for public/anonymous web sessions)
CREATE TABLE IF NOT EXISTS customer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customer Channels Mapping Table (Consolidates multiple channels to one customer record)
CREATE TABLE IF NOT EXISTS customer_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel_type channel_type NOT NULL,
  channel_identity VARCHAR(255) NOT NULL, -- session UUID, WhatsApp JID, or phone number
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_channel_identity UNIQUE (channel_type, channel_identity)
);

-- Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  channel_type channel_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT conversation_status_check CHECK (status IN ('active', 'closed'))
);

-- Messages Table (Supports WhatsApp delivery states and audio/multimedia payloads)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender message_sender NOT NULL,
  content TEXT NOT NULL,
  
  -- WhatsApp / voice integration details
  external_message_id VARCHAR(255), -- ID generated by third party (WhatsApp SID, Twilio SID)
  delivery_status message_delivery_status NOT NULL DEFAULT 'pending',
  media_urls TEXT[] NOT NULL DEFAULT '{}'::TEXT[], -- images/voice note payloads
  
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- dynamic details like LangGraph nodes traversed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  appointment_time TIMESTAMPTZ NOT NULL,
  status appointment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  cancellation_reason TEXT,
  rescheduled_from_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- AVAILABILITY SCHEDULES (recurring weekly patterns)
-- ==========================================
CREATE TABLE IF NOT EXISTS availability_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT time_range_check CHECK (start_time < end_time)
);

-- ==========================================
-- AVAILABILITY OVERRIDES (date-specific exceptions)
-- ==========================================
CREATE TABLE IF NOT EXISTS availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  reason VARCHAR(255),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT override_time_range CHECK (
    (is_available = TRUE AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
    OR (is_available = FALSE)
  )
);

-- ==========================================
-- CALENDAR CREDENTIALS (for future OAuth integrations)
-- ==========================================
CREATE TABLE IF NOT EXISTS calendar_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Escalations Table
CREATE TABLE IF NOT EXISTS escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status escalation_status NOT NULL DEFAULT 'pending',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Knowledge Requests Table (Learning Inbox queue)
CREATE TABLE IF NOT EXISTS knowledge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  unanswered_question TEXT NOT NULL,
  suggested_answer TEXT,
  status knowledge_request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Follow-Ups Table
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
  voice_call_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Voice Calls Table (Detailed integration logs for incoming/outgoing phone interactions)
CREATE TABLE IF NOT EXISTS voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  
  external_call_sid VARCHAR(255) UNIQUE NOT NULL, -- e.g. Twilio Call SID
  direction VARCHAR(20) NOT NULL, -- 'inbound', 'outbound'
  call_status VARCHAR(50) NOT NULL, -- 'ringing', 'in-progress', 'completed', 'busy', 'missed', 'failed'
  duration_seconds INT,
  recording_url TEXT,
  transcription TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT voice_call_direction_check CHECK (direction IN ('inbound', 'outbound'))
);

-- Add FK and unique index on follow_ups.voice_call_id for missed-call deduplication
ALTER TABLE follow_ups ADD CONSTRAINT fk_follow_up_voice_call
  FOREIGN KEY (voice_call_id) REFERENCES voice_calls(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_follow_ups_voice_call ON follow_ups(voice_call_id) WHERE voice_call_id IS NOT NULL;

-- Customer Lifecycle Event Log Table (Stores transitions for auditing & analytical triggers)
CREATE TABLE IF NOT EXISTS customer_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  previous_state customer_lifecycle_state,
  new_state customer_lifecycle_state NOT NULL,
  trigger_event VARCHAR(100) NOT NULL, -- 'new_inquiry', 'message_received', 'appointment_booked', 'manual_dashboard_change', etc.
  notes TEXT,
  changed_by UUID, -- references auth.users(id) if updated via dashboard
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 3. TRIGGERS (AUTOMATED AUDITING & TIMESTAMPS)
-- ==========================================

-- Set timestamp trigger logic
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp trigger to all updated tables
CREATE TRIGGER set_timestamp_businesses BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_staff_profiles BEFORE UPDATE ON staff_profiles FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_services BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_customers BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_customer_sessions BEFORE UPDATE ON customer_sessions FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_customer_channels BEFORE UPDATE ON customer_channels FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_conversations BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_appointments BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_escalations BEFORE UPDATE ON escalations FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_knowledge_requests BEFORE UPDATE ON knowledge_requests FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_follow_ups BEFORE UPDATE ON follow_ups FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_voice_calls BEFORE UPDATE ON voice_calls FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_availability_schedules BEFORE UPDATE ON availability_schedules FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_availability_overrides BEFORE UPDATE ON availability_overrides FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_calendar_credentials BEFORE UPDATE ON calendar_credentials FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- Trigger function to automatically audit customer state insertions
CREATE OR REPLACE FUNCTION log_customer_lifecycle_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_trigger_event VARCHAR(100);
  v_changed_by UUID;
BEGIN
  -- Read transaction configuration values if set by application session
  v_trigger_event := COALESCE(
    NULLIF(current_setting('app.lifecycle_trigger', true), ''),
    'new_inquiry_created'
  );
  
  BEGIN
    v_changed_by := NULLIF(current_setting('app.changed_by', true), '')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_changed_by := NULL;
  END;

  INSERT INTO customer_lifecycle_events (
    business_id,
    customer_id,
    previous_state,
    new_state,
    trigger_event,
    changed_by
  ) VALUES (
    NEW.business_id,
    NEW.id,
    NULL,
    NEW.lifecycle_state,
    v_trigger_event,
    v_changed_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_customer_lifecycle_insert
AFTER INSERT ON customers
FOR EACH ROW EXECUTE FUNCTION log_customer_lifecycle_creation();


-- Trigger function to automatically audit customer state updates
CREATE OR REPLACE FUNCTION log_customer_lifecycle_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_trigger_event VARCHAR(100);
  v_changed_by UUID;
BEGIN
  -- Log ONLY when state changes
  IF OLD.lifecycle_state IS NULL OR OLD.lifecycle_state <> NEW.lifecycle_state THEN
    v_trigger_event := COALESCE(
      NULLIF(current_setting('app.lifecycle_trigger', true), ''),
      'system_update'
    );
    
    BEGIN
      v_changed_by := NULLIF(current_setting('app.changed_by', true), '')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_changed_by := NULL;
    END;

    INSERT INTO customer_lifecycle_events (
      business_id,
      customer_id,
      previous_state,
      new_state,
      trigger_event,
      changed_by
    ) VALUES (
      NEW.business_id,
      NEW.id,
      OLD.lifecycle_state,
      NEW.lifecycle_state,
      v_trigger_event,
      v_changed_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_customer_lifecycle_change
AFTER UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION log_customer_lifecycle_transition();

-- ==========================================
-- 4. PERFORMANCE OPTIMIZATION INDEXES
-- ==========================================

CREATE INDEX idx_staff_profiles_user ON staff_profiles(user_id);
CREATE INDEX idx_staff_profiles_business ON staff_profiles(business_id);
CREATE INDEX idx_services_business ON services(business_id);
CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_customers_lifecycle ON customers(lifecycle_state);
CREATE INDEX idx_customer_channels_lookup ON customer_channels(channel_type, channel_identity);
CREATE INDEX idx_customer_channels_customer ON customer_channels(customer_id);
CREATE INDEX idx_conversations_lookup ON conversations(business_id, customer_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_external_id ON messages(external_message_id);
CREATE INDEX idx_appointments_schedule ON appointments(business_id, appointment_time);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_escalations_pending ON escalations(business_id, status) WHERE status = 'pending';
CREATE INDEX idx_knowledge_requests_pending ON knowledge_requests(business_id, status) WHERE status = 'pending';
CREATE INDEX idx_follow_ups_due ON follow_ups(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_voice_calls_sid ON voice_calls(external_call_sid);
CREATE INDEX idx_voice_calls_lookup ON voice_calls(business_id, customer_id);
CREATE INDEX idx_lifecycle_events_customer ON customer_lifecycle_events(customer_id);
CREATE INDEX idx_availability_schedules_business ON availability_schedules(business_id);
CREATE INDEX idx_availability_schedules_day ON availability_schedules(business_id, day_of_week);
CREATE INDEX idx_availability_overrides_date ON availability_overrides(business_id, date);
CREATE INDEX idx_appointments_rescheduled_from ON appointments(rescheduled_from_id) WHERE rescheduled_from_id IS NOT NULL;

CREATE INDEX idx_businesses_slug ON businesses(slug);

-- Customer sessions indexes
CREATE INDEX idx_customer_sessions_session ON customer_sessions(session_id);
CREATE INDEX idx_customer_sessions_business ON customer_sessions(business_id);

-- ==========================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable Row Level Security on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_lifecycle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;

-- Helper Function to resolve current staff user's business_id
CREATE OR REPLACE FUNCTION current_user_business_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT business_id 
    FROM public.staff_profiles 
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper Function to retrieve request-provided guest session header (for web chat anonymous users)
CREATE OR REPLACE FUNCTION current_client_session_id()
RETURNS VARCHAR AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.headers', true)::json->>'x-client-session-id',
    ''
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS POLICIES: staff_profiles
CREATE POLICY staff_read_own_profile ON staff_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- RLS POLICIES: businesses
CREATE POLICY staff_read_own_business ON businesses
  FOR SELECT TO authenticated USING (id = current_user_business_id());

CREATE POLICY staff_update_own_business ON businesses
  FOR UPDATE TO authenticated USING (id = current_user_business_id()) WITH CHECK (id = current_user_business_id());

-- RLS POLICIES: services
CREATE POLICY public_read_services ON services
  FOR SELECT TO public USING (true); -- Clients need to read services to view options

CREATE POLICY staff_manage_services ON services
  FOR ALL TO authenticated USING (business_id = current_user_business_id()) WITH CHECK (business_id = current_user_business_id());

-- RLS POLICIES: customers
CREATE POLICY staff_read_customers ON customers
  FOR SELECT TO authenticated USING (business_id = current_user_business_id());

CREATE POLICY staff_write_customers ON customers
  FOR ALL TO authenticated USING (business_id = current_user_business_id()) WITH CHECK (business_id = current_user_business_id());

CREATE POLICY anon_insert_customers ON customers
  FOR INSERT TO anon WITH CHECK (true); -- Anonymous clients can create profiles during initial chat

-- RLS POLICIES: customer_channels
CREATE POLICY staff_read_channels ON customer_channels
  FOR SELECT TO authenticated USING (business_id = current_user_business_id());

CREATE POLICY anon_insert_channels ON customer_channels
  FOR INSERT TO anon WITH CHECK (channel_identity = current_client_session_id());

-- RLS POLICIES: customer_sessions
CREATE POLICY anon_insert_sessions ON customer_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY anon_read_own_sessions ON customer_sessions FOR SELECT TO anon USING (session_id = current_setting('app.session_id', true));

-- RLS POLICIES: conversations
CREATE POLICY staff_read_conversations ON conversations
  FOR SELECT TO authenticated USING (business_id = current_user_business_id());

CREATE POLICY staff_manage_conversations ON conversations
  FOR ALL TO authenticated USING (business_id = current_user_business_id()) WITH CHECK (business_id = current_user_business_id());

CREATE POLICY anon_read_own_conversations ON conversations
  FOR SELECT TO anon USING (
    EXISTS (
      SELECT 1 FROM customer_channels cc
      WHERE cc.customer_id = conversations.customer_id
        AND cc.channel_identity = current_client_session_id()
    )
  );

CREATE POLICY anon_insert_own_conversations ON conversations
  FOR INSERT TO anon WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_channels cc
      WHERE cc.customer_id = conversations.customer_id
        AND cc.channel_identity = current_client_session_id()
    )
  );

-- RLS POLICIES: messages
CREATE POLICY staff_read_messages ON messages
  FOR SELECT TO authenticated USING (business_id = current_user_business_id());

CREATE POLICY staff_manage_messages ON messages
  FOR ALL TO authenticated USING (business_id = current_user_business_id()) WITH CHECK (business_id = current_user_business_id());

CREATE POLICY anon_read_own_messages ON messages
  FOR SELECT TO anon USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN customer_channels cc ON cc.customer_id = c.customer_id
      WHERE c.id = messages.conversation_id
        AND cc.channel_identity = current_client_session_id()
    )
  );

CREATE POLICY anon_insert_own_messages ON messages
  FOR INSERT TO anon WITH CHECK (
    sender = 'customer' AND
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN customer_channels cc ON cc.customer_id = c.customer_id
      WHERE c.id = messages.conversation_id
        AND cc.channel_identity = current_client_session_id()
    )
  );

-- RLS POLICIES: appointments
CREATE POLICY staff_manage_appointments ON appointments
  FOR ALL TO authenticated USING (business_id = current_user_business_id()) WITH CHECK (business_id = current_user_business_id());

CREATE POLICY anon_read_own_appointments ON appointments
  FOR SELECT TO anon USING (
    EXISTS (
      SELECT 1 FROM customer_channels cc
      WHERE cc.customer_id = appointments.customer_id
        AND cc.channel_identity = current_client_session_id()
    )
  );

CREATE POLICY anon_insert_own_appointments ON appointments
  FOR INSERT TO anon WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_channels cc
      WHERE cc.customer_id = appointments.customer_id
        AND cc.channel_identity = current_client_session_id()
    )
  );

-- RLS POLICIES: escalations
CREATE POLICY staff_manage_escalations ON escalations
  FOR ALL TO authenticated USING (business_id = current_user_business_id()) WITH CHECK (business_id = current_user_business_id());

-- RLS POLICIES: knowledge_requests
CREATE POLICY staff_manage_knowledge_requests ON knowledge_requests
  FOR ALL TO authenticated USING (business_id = current_user_business_id()) WITH CHECK (business_id = current_user_business_id());

-- RLS POLICIES: follow_ups
CREATE POLICY staff_manage_follow_ups ON follow_ups
  FOR ALL TO authenticated USING (business_id = current_user_business_id()) WITH CHECK (business_id = current_user_business_id());

-- RLS POLICIES: voice_calls
CREATE POLICY staff_manage_voice_calls ON voice_calls
  FOR ALL TO authenticated USING (business_id = current_user_business_id()) WITH CHECK (business_id = current_user_business_id());

-- RLS POLICIES: availability_schedules
ALTER TABLE availability_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_manage_availability_schedules ON availability_schedules
  FOR ALL TO authenticated USING (business_id = current_user_business_id()) WITH CHECK (business_id = current_user_business_id());

-- RLS POLICIES: availability_overrides
ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_manage_availability_overrides ON availability_overrides
  FOR ALL TO authenticated USING (business_id = current_user_business_id()) WITH CHECK (business_id = current_user_business_id());

-- RLS POLICIES: calendar_credentials
ALTER TABLE calendar_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_manage_calendar_credentials ON calendar_credentials
  FOR ALL TO authenticated USING (business_id = current_user_business_id()) WITH CHECK (business_id = current_user_business_id());

-- RLS POLICIES: customer_lifecycle_events
CREATE POLICY staff_read_lifecycle_events ON customer_lifecycle_events
  FOR SELECT TO authenticated USING (business_id = current_user_business_id());

-- ==========================================
-- 6. DEMO SEED DATA
-- ==========================================

-- Create Demo Dental Clinic Business
INSERT INTO businesses (id, name, slug, business_type, archetype, phone, email, address, description, timezone, faqs, escalation_rules, appointment_settings)
VALUES (
  'd4a6f7b1-e23a-48d6-95bc-79f94eb97210',
  'Apex Dental Care',
  'apex-dental',
  'dental',
  'solo_practitioner',
  '(555) 123-4567',
  'info@apexdental.com',
  '456 Healthcare Blvd, Suite 100, Downtown, CA 90210',
  'Your trusted family dental practice serving the community for over 15 years.',
  'America/Los_Angeles',
  '[
    {"question": "What are your opening hours?", "answer": "We are open Monday to Friday from 9 AM to 6 PM, and Saturday from 9 AM to 2 PM."},
    {"question": "Do you accept insurance?", "answer": "Yes, we accept major dental PPO insurance plans. Please contact our office to confirm your specific coverage details."},
    {"question": "Where are you located?", "answer": "We are located at 456 Healthcare Blvd, Suite 100, Downtown."}
  ]'::jsonb,
  '{
    "autoEscalateKeywords": ["pain", "emergency", "bleeding", "severe", "sue", "lawyer"],
    "alertMethods": ["dashboard", "email"]
  }'::jsonb,
  '{
    "slotDurationMinutes": 30,
    "workingHours": {
      "weekday": {"start": "09:00", "end": "18:00"},
      "saturday": {"start": "09:00", "end": "14:00"},
      "sunday": null
    },
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
  }'::jsonb
);

-- Seed Services associated with Apex Dental Care
INSERT INTO services (business_id, name, description, price_min, price_max, duration_minutes)
VALUES 
  ('d4a6f7b1-e23a-48d6-95bc-79f94eb97210', 'Routine Teeth Cleaning', 'Professional dental cleaning, scaling, and polishing.', 75.00, 150.00, 30),
  ('d4a6f7b1-e23a-48d6-95bc-79f94eb97210', 'Dental Filling', 'Composite tooth-colored restoration for cavities.', 120.00, 250.00, 45),
  ('d4a6f7b1-e23a-48d6-95bc-79f94eb97210', 'Invisalign Consultation', 'Clear aligner assessment and 3D digital scan.', 0.00, 50.00, 30);

-- Seed Staff Profile (Owner)
INSERT INTO staff_profiles (user_id, business_id, role, full_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'd4a6f7b1-e23a-48d6-95bc-79f94eb97210', 'owner', 'Dr. Sarah Chen');

-- Seed Availability Schedules (Mon-Fri 9-6, Sat 9-2)
INSERT INTO availability_schedules (business_id, day_of_week, start_time, end_time)
VALUES
  ('d4a6f7b1-e23a-48d6-95bc-79f94eb97210', 0, '09:00', '14:00'), -- Sunday (limited)
  ('d4a6f7b1-e23a-48d6-95bc-79f94eb97210', 1, '09:00', '18:00'),
  ('d4a6f7b1-e23a-48d6-95bc-79f94eb97210', 2, '09:00', '18:00'),
  ('d4a6f7b1-e23a-48d6-95bc-79f94eb97210', 3, '09:00', '18:00'),
  ('d4a6f7b1-e23a-48d6-95bc-79f94eb97210', 4, '09:00', '18:00'),
  ('d4a6f7b1-e23a-48d6-95bc-79f94eb97210', 5, '09:00', '18:00'),
  ('d4a6f7b1-e23a-48d6-95bc-79f94eb97210', 6, '09:00', '14:00');

-- Seed Sample Customers with varied lifecycle states
INSERT INTO customers (id, business_id, name, email, phone, lifecycle_state, last_interaction_at) VALUES
  ('c0a80121-0001-4000-8000-000000000001', 'd4a6f7b1-e23a-48d6-95bc-79f94eb97210', 'John Smith', 'john.smith@email.com', '(555) 111-2222', 'New Inquiry', NOW() - INTERVAL '1 hour'),
  ('c0a80121-0001-4000-8000-000000000002', 'd4a6f7b1-e23a-48d6-95bc-79f94eb97210', 'Emily Johnson', 'emily.j@email.com', '(555) 222-3333', 'Qualified', NOW() - INTERVAL '1 day'),
  ('c0a80121-0001-4000-8000-000000000003', 'd4a6f7b1-e23a-48d6-95bc-79f94eb97210', 'Michael Brown', 'michael.b@email.com', '(555) 333-4444', 'Booking Opportunity', NOW() - INTERVAL '3 hours'),
  ('c0a80121-0001-4000-8000-000000000004', 'd4a6f7b1-e23a-48d6-95bc-79f94eb97210', 'Sophia Davis', 'sophia.d@email.com', '(555) 444-5555', 'Booked', NOW() - INTERVAL '30 minutes'),
  ('c0a80121-0001-4000-8000-000000000005', 'd4a6f7b1-e23a-48d6-95bc-79f94eb97210', 'James Wilson', 'james.w@email.com', '(555) 555-6666', 'Follow-Up Pending', NOW() - INTERVAL '2 days');

-- Seed Sample Conversations
INSERT INTO conversations (id, customer_id, business_id, status, channel_type) VALUES
  ('e0a80121-0001-4000-8000-000000000001', 'c0a80121-0001-4000-8000-000000000001', 'd4a6f7b1-e23a-48d6-95bc-79f94eb97210', 'active', 'web_chat'),
  ('e0a80121-0001-4000-8000-000000000002', 'c0a80121-0001-4000-8000-000000000003', 'd4a6f7b1-e23a-48d6-95bc-79f94eb97210', 'active', 'web_chat');

-- Seed Sample Messages
INSERT INTO messages (conversation_id, business_id, sender, content) VALUES
  ('e0a80121-0001-4000-8000-000000000001', 'd4a6f7b1-e23a-48d6-95bc-79f94eb97210', 'customer', 'Hi, I''d like to schedule a teeth cleaning.'),
  ('e0a80121-0001-4000-8000-000000000001', 'd4a6f7b1-e23a-48d6-95bc-79f94eb97210', 'agent', 'Hello John! I''d be happy to help you schedule a teeth cleaning. We have availability this week. What day works best for you?'),
  ('e0a80121-0001-4000-8000-000000000002', 'd4a6f7b1-e23a-48d6-95bc-79f94eb97210', 'customer', 'Do you offer payment plans for dental work?'),
  ('e0a80121-0001-4000-8000-000000000002', 'd4a6f7b1-e23a-48d6-95bc-79f94eb97210', 'agent', 'Yes, we do offer flexible payment plans. Let me connect you with our financing options.');

-- Seed Sample Appointment (for tomorrow)
INSERT INTO appointments (customer_id, business_id, service_id, appointment_time, status) VALUES
  ('c0a80121-0001-4000-8000-000000000004', 'd4a6f7b1-e23a-48d6-95bc-79f94eb97210', (SELECT id FROM services WHERE business_id = 'd4a6f7b1-e23a-48d6-95bc-79f94eb97210' LIMIT 1), NOW() + INTERVAL '1 day' + INTERVAL '10 hours', 'confirmed');
