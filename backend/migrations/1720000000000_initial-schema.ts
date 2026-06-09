import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createExtension('uuid-ossp', { ifNotExists: true });

  pgm.createType('customer_lifecycle_state', [
    'New Inquiry', 'Information Gathering', 'Qualified', 'Booking Opportunity',
    'Booked', 'Customer', 'Follow-Up Pending', 'Escalated', 'Lost',
  ]);

  pgm.createType('channel_type', ['web_chat', 'whatsapp', 'voice']);
  pgm.createType('message_sender', ['customer', 'agent', 'human_owner', 'system']);
  pgm.createType('message_delivery_status', ['pending', 'sent', 'delivered', 'read', 'failed']);
  pgm.createType('appointment_status', ['pending', 'confirmed', 'cancelled', 'rescheduled']);
  pgm.createType('escalation_status', ['pending', 'resolved']);
  pgm.createType('knowledge_request_status', ['pending', 'approved', 'rejected']);
  pgm.createType('follow_up_status', ['pending', 'sent', 'cancelled']);
  pgm.createType('follow_up_type', ['re_engagement', 'day_1', 'day_3', 'missed_call']);

  pgm.createTable('businesses', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(255)', notNull: true },
    slug: { type: 'varchar(100)', unique: true, notNull: true },
    business_type: { type: 'varchar(100)', notNull: true, default: 'dental' },
    archetype: { type: 'varchar(100)', notNull: true, default: 'standard_clinic' },
    phone: { type: 'varchar(50)' },
    email: { type: 'varchar(255)' },
    address: { type: 'text' },
    description: { type: 'text' },
    logo_url: { type: 'text' },
    timezone: { type: 'varchar(50)', default: 'UTC' },
    faqs: { type: 'jsonb', notNull: true, default: pgm.func("'[]'::jsonb") },
    escalation_rules: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    appointment_settings: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('staff_profiles', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', unique: true, notNull: true },
    business_id: { type: 'uuid', notNull: true, references: 'businesses', onDelete: 'cascade' },
    role: { type: 'varchar(50)', notNull: true, default: 'staff' },
    full_name: { type: 'varchar(255)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('services', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    business_id: { type: 'uuid', notNull: true, references: 'businesses', onDelete: 'cascade' },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    price_min: { type: 'decimal(10,2)', notNull: true },
    price_max: { type: 'decimal(10,2)', notNull: true },
    duration_minutes: { type: 'int', notNull: true, default: 30 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('services', 'price_range_valid', { check: 'price_min <= price_max' });
  pgm.addConstraint('services', 'duration_positive', { check: 'duration_minutes > 0' });

  pgm.createTable('customers', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    business_id: { type: 'uuid', notNull: true, references: 'businesses', onDelete: 'cascade' },
    name: { type: 'varchar(255)' },
    email: { type: 'varchar(255)' },
    phone: { type: 'varchar(50)' },
    lifecycle_state: { type: 'customer_lifecycle_state', notNull: true, default: 'New Inquiry' },
    last_interaction_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('customers', 'profile_has_identity', {
    check: "name IS NOT NULL OR email IS NOT NULL OR phone IS NOT NULL",
  });

  pgm.createTable('customer_sessions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    session_id: { type: 'varchar(255)', unique: true, notNull: true },
    customer_id: { type: 'uuid', references: 'customers', onDelete: 'set null' },
    business_id: { type: 'uuid', notNull: true, references: 'businesses', onDelete: 'cascade' },
    last_active_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('customer_channels', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    customer_id: { type: 'uuid', notNull: true, references: 'customers', onDelete: 'cascade' },
    business_id: { type: 'uuid', notNull: true },
    channel_type: { type: 'channel_type', notNull: true },
    channel_identity: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('customer_channels', 'unique_channel_per_identity', {
    unique: ['channel_type', 'channel_identity'],
  });

  pgm.createTable('conversations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    customer_id: { type: 'uuid', notNull: true, references: 'customers', onDelete: 'cascade' },
    business_id: { type: 'uuid', notNull: true, references: 'businesses', onDelete: 'cascade' },
    status: { type: 'varchar(20)', notNull: true, default: 'active' },
    channel_type: { type: 'channel_type', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('messages', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    conversation_id: { type: 'uuid', notNull: true, references: 'conversations', onDelete: 'cascade' },
    sender: { type: 'message_sender', notNull: true },
    content: { type: 'text', notNull: true },
    metadata: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('appointments', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    customer_id: { type: 'uuid', notNull: true, references: 'customers', onDelete: 'cascade' },
    business_id: { type: 'uuid', notNull: true, references: 'businesses', onDelete: 'cascade' },
    service_id: { type: 'uuid', references: 'services', onDelete: 'set null' },
    appointment_time: { type: 'timestamptz', notNull: true },
    status: { type: 'appointment_status', notNull: true, default: 'pending' },
    notes: { type: 'text' },
    cancellation_reason: { type: 'text' },
    rescheduled_from_id: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('escalations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    customer_id: { type: 'uuid', notNull: true, references: 'customers', onDelete: 'cascade' },
    business_id: { type: 'uuid', notNull: true, references: 'businesses', onDelete: 'cascade' },
    conversation_id: { type: 'uuid', notNull: true, references: 'conversations', onDelete: 'cascade' },
    reason: { type: 'text', notNull: true },
    status: { type: 'escalation_status', notNull: true, default: 'pending' },
    resolved_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('knowledge_requests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    business_id: { type: 'uuid', notNull: true, references: 'businesses', onDelete: 'cascade' },
    conversation_id: { type: 'uuid', notNull: true, references: 'conversations', onDelete: 'cascade' },
    unanswered_question: { type: 'text', notNull: true },
    suggested_answer: { type: 'text' },
    status: { type: 'knowledge_request_status', notNull: true, default: 'pending' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('follow_ups', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    customer_id: { type: 'uuid', notNull: true, references: 'customers', onDelete: 'cascade' },
    business_id: { type: 'uuid', notNull: true, references: 'businesses', onDelete: 'cascade' },
    type: { type: 'follow_up_type', notNull: true },
    channel: { type: 'varchar(50)', notNull: true, default: 'web_chat' },
    trigger_reason: { type: 'varchar(50)', notNull: true, default: 'inactivity' },
    attempt_number: { type: 'int', notNull: true, default: 1 },
    scheduled_at: { type: 'timestamptz', notNull: true },
    status: { type: 'follow_up_status', notNull: true, default: 'pending' },
    sent_at: { type: 'timestamptz' },
    resolved_at: { type: 'timestamptz' },
    voice_call_id: { type: 'uuid' },
    metadata: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('voice_calls', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    business_id: { type: 'uuid', notNull: true, references: 'businesses', onDelete: 'cascade' },
    customer_id: { type: 'uuid', notNull: true, references: 'customers', onDelete: 'cascade' },
    conversation_id: { type: 'uuid', references: 'conversations', onDelete: 'set null' },
    external_call_sid: { type: 'varchar(255)', unique: true, notNull: true },
    direction: { type: 'varchar(20)', notNull: true },
    call_status: { type: 'varchar(50)', notNull: true },
    duration_seconds: { type: 'int' },
    recording_url: { type: 'text' },
    transcription: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('voice_calls', 'voice_call_direction_check', {
    check: "direction IN ('inbound', 'outbound')",
  });

  pgm.addConstraint('follow_ups', 'fk_follow_up_voice_call', {
    foreignKeys: {
      columns: 'voice_call_id',
      references: 'voice_calls(id)',
      onDelete: 'SET NULL',
    },
  });
  pgm.sql('CREATE UNIQUE INDEX IF NOT EXISTS idx_follow_ups_voice_call ON follow_ups(voice_call_id) WHERE voice_call_id IS NOT NULL');

  pgm.createTable('customer_lifecycle_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    business_id: { type: 'uuid', notNull: true, references: 'businesses', onDelete: 'cascade' },
    customer_id: { type: 'uuid', notNull: true, references: 'customers', onDelete: 'cascade' },
    previous_state: { type: 'customer_lifecycle_state' },
    new_state: { type: 'customer_lifecycle_state', notNull: true },
    trigger_event: { type: 'varchar(100)', notNull: true },
    notes: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('availability_schedules', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    business_id: { type: 'uuid', notNull: true, references: 'businesses', onDelete: 'cascade' },
    service_id: { type: 'uuid', references: 'services', onDelete: 'cascade' },
    day_of_week: { type: 'int', notNull: true },
    start_time: { type: 'time', notNull: true },
    end_time: { type: 'time', notNull: true },
    effective_from: { type: 'date', notNull: true, default: pgm.func('CURRENT_DATE') },
    effective_until: { type: 'date' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('availability_overrides', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    business_id: { type: 'uuid', notNull: true, references: 'businesses', onDelete: 'cascade' },
    service_id: { type: 'uuid', references: 'services', onDelete: 'cascade' },
    date: { type: 'date', notNull: true },
    start_time: { type: 'time' },
    end_time: { type: 'time' },
    is_available: { type: 'boolean', notNull: true, default: true },
    reason: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('calendar_credentials', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    business_id: { type: 'uuid', notNull: true, references: 'businesses', onDelete: 'cascade' },
    provider: { type: 'varchar(50)', notNull: true },
    access_token: { type: 'text' },
    refresh_token: { type: 'text' },
    token_expires_at: { type: 'timestamptz' },
    calendar_id: { type: 'text' },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('calendar_credentials');
  pgm.dropTable('availability_overrides');
  pgm.dropTable('availability_schedules');
  pgm.dropTable('customer_lifecycle_events');
  pgm.dropTable('voice_calls');
  pgm.dropTable('follow_ups');
  pgm.dropTable('knowledge_requests');
  pgm.dropTable('escalations');
  pgm.dropTable('appointments');
  pgm.dropTable('messages');
  pgm.dropTable('conversations');
  pgm.dropTable('customer_channels');
  pgm.dropTable('customer_sessions');
  pgm.dropTable('customers');
  pgm.dropTable('services');
  pgm.dropTable('staff_profiles');
  pgm.dropTable('businesses');

  pgm.dropType('follow_up_type');
  pgm.dropType('follow_up_status');
  pgm.dropType('knowledge_request_status');
  pgm.dropType('escalation_status');
  pgm.dropType('appointment_status');
  pgm.dropType('message_delivery_status');
  pgm.dropType('message_sender');
  pgm.dropType('channel_type');
  pgm.dropType('customer_lifecycle_state');

  pgm.sql('DROP FUNCTION IF EXISTS update_updated_at_column();');
}
