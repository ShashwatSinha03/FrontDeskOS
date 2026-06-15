import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // ── 1. Add 'status' column to businesses (if not already present) ──
  pgm.addColumn('businesses', {
    status: { type: 'varchar(20)', notNull: true, default: 'active' },
  }, { ifNotExists: true });

  // ── 2. Add 'is_active' column to services ──
  pgm.addColumn('services', {
    is_active: { type: 'boolean', notNull: true, default: true },
  }, { ifNotExists: true });

  // ── 3. Add 'business_id' column to messages (denormalized for efficient queries) ──
  // Need raw SQL for IF NOT EXISTS pattern
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'business_id'
      ) THEN
        ALTER TABLE messages ADD COLUMN business_id uuid;
        ALTER TABLE messages ADD CONSTRAINT fk_messages_business
          FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  // ── 4. Add 'changed_by' column to customer_lifecycle_events ──
  pgm.addColumn('customer_lifecycle_events', {
    changed_by: { type: 'varchar(255)' },
  }, { ifNotExists: true });

  // ── 5. Create notifications table (if not exists) ──
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS notifications (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      type varchar(50) NOT NULL,
      title varchar(255) NOT NULL,
      message text NOT NULL,
      entity_type varchar(50),
      entity_id uuid,
      is_read boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  // ── 6. Add 'completed' to appointment_status enum ──
  pgm.sql(`
    ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'completed';
  `);

  // ── 7. Add missing indexes ──
  // customers: business_id + lifecycle_state (dashboard queries)
  pgm.createIndex('customers', 'business_id', { ifNotExists: true });
  pgm.createIndex('customers', ['business_id', 'lifecycle_state'], { ifNotExists: true });

  // conversations: customer_id + business_id + status (chat lookup)
  pgm.createIndex('conversations', ['customer_id', 'business_id', 'status'], { ifNotExists: true });

  // messages: conversation_id (highest volume table)
  pgm.createIndex('messages', 'conversation_id', { ifNotExists: true });

  // appointments: business_id + appointment_time (calendar/availability)
  pgm.createIndex('appointments', 'business_id', { ifNotExists: true });
  pgm.createIndex('appointments', ['business_id', 'appointment_time'], { ifNotExists: true });

  // follow_ups: status + scheduled_at (background processor)
  pgm.createIndex('follow_ups', 'status', { ifNotExists: true });
  pgm.createIndex('follow_ups', ['status', 'scheduled_at'], { ifNotExists: true });

  // customer_channels: customer_id (customer resolution)
  pgm.createIndex('customer_channels', 'customer_id', { ifNotExists: true });

  // escalations: business_id + status (dashboard)
  pgm.createIndex('escalations', 'business_id', { ifNotExists: true });
  pgm.createIndex('escalations', ['business_id', 'status'], { ifNotExists: true });

  // knowledge_requests: business_id + status
  pgm.createIndex('knowledge_requests', 'business_id', { ifNotExists: true });
  pgm.createIndex('knowledge_requests', ['business_id', 'status'], { ifNotExists: true });

  // ── 8. Create the update_updated_at_column function (if not exists) ──
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ── 9. Attach update_updated_at_column trigger to ALL tables ──
  const triggerTables = [
    'businesses', 'staff_profiles', 'services', 'customers',
    'customer_channels', 'conversations', 'appointments',
    'escalations', 'knowledge_requests', 'follow_ups',
    'voice_calls', 'availability_schedules', 'availability_overrides',
    'calendar_credentials', 'business_channels', 'message_deliveries',
  ];

  for (const tbl of triggerTables) {
    pgm.sql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgrelid = '${tbl}'::regclass AND tgname = 'trg_${tbl}_updated_at'
        ) THEN
          CREATE TRIGGER trg_${tbl}_updated_at
            BEFORE UPDATE ON ${tbl}
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
          END IF;
      END $$;
    `);
  }

  // ── 10. Add partial unique index on appointments to prevent double-booking ──
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_appointment_active_slot
      ON appointments (business_id, appointment_time)
      WHERE status IN ('pending', 'confirmed');
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // WARNING: This migration is NOT reversable without data loss.
  // Individual columns/tables can be dropped manually if needed.
  pgm.sql(`DROP TABLE IF EXISTS notifications`);
  pgm.dropIndex('customers', 'business_id');
  pgm.dropIndex('customers', ['business_id', 'lifecycle_state']);
  pgm.dropIndex('conversations', ['customer_id', 'business_id', 'status']);
  pgm.dropIndex('messages', 'conversation_id');
  pgm.dropIndex('appointments', 'business_id');
  pgm.dropIndex('appointments', ['business_id', 'appointment_time']);
  pgm.dropIndex('follow_ups', 'status');
  pgm.dropIndex('follow_ups', ['status', 'scheduled_at']);
  pgm.dropIndex('customer_channels', 'customer_id');
  pgm.dropIndex('escalations', 'business_id');
  pgm.dropIndex('escalations', ['business_id', 'status']);
  pgm.dropIndex('knowledge_requests', 'business_id');
  pgm.dropIndex('knowledge_requests', ['business_id', 'status']);

  const triggerTables = [
    'businesses', 'staff_profiles', 'services', 'customers',
    'customer_channels', 'conversations', 'appointments',
    'escalations', 'knowledge_requests', 'follow_ups',
    'voice_calls', 'availability_schedules', 'availability_overrides',
    'calendar_credentials', 'business_channels', 'message_deliveries',
  ];
  for (const tbl of triggerTables) {
    pgm.sql(`DROP TRIGGER IF EXISTS trg_${tbl}_updated_at ON ${tbl}`);
  }

  pgm.sql(`DROP INDEX IF EXISTS uq_appointment_active_slot`);
}
