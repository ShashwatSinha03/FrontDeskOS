import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('message_deliveries', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    message_id: { type: 'uuid', notNull: true, references: 'messages', onDelete: 'cascade' },
    conversation_id: { type: 'uuid', notNull: true, references: 'conversations', onDelete: 'cascade' },
    business_id: { type: 'uuid', notNull: true, references: 'businesses', onDelete: 'cascade' },
    channel_type: { type: 'varchar(50)', notNull: true },
    delivery_status: { type: 'message_delivery_status', notNull: true, default: 'pending' },
    provider: { type: 'varchar(50)', notNull: true, default: 'internal' },
    provider_message_id: { type: 'varchar(255)' },
    failure_reason: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('message_deliveries', 'message_id');
  pgm.createIndex('message_deliveries', 'conversation_id');
  pgm.createIndex('message_deliveries', 'business_id');
  pgm.createIndex('message_deliveries', 'delivery_status');
  pgm.createIndex('message_deliveries', ['business_id', 'delivery_status']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('message_deliveries');
}
