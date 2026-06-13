import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('business_channels', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    business_id: { type: 'uuid', notNull: true, references: 'businesses', onDelete: 'cascade' },
    channel_type: { type: 'varchar(50)', notNull: true },
    enabled: { type: 'boolean', notNull: true, default: true },
    provider: { type: 'varchar(50)', notNull: true, default: 'internal' },
    config_json: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('business_channels', 'unique_business_channel', {
    unique: ['business_id', 'channel_type'],
  });

  pgm.createIndex('business_channels', 'business_id');
  pgm.createIndex('business_channels', 'channel_type');

  // Seed all existing businesses with web_chat enabled
  pgm.sql(`
    INSERT INTO business_channels (business_id, channel_type, enabled, provider, config_json)
    SELECT id, 'web_chat', true, 'internal', '{}'::jsonb
    FROM businesses
    WHERE NOT EXISTS (
      SELECT 1 FROM business_channels bc
      WHERE bc.business_id = businesses.id AND bc.channel_type = 'web_chat'
    )
  `);

  // Seed all existing businesses with whatsapp (disabled by default, ready for future)
  pgm.sql(`
    INSERT INTO business_channels (business_id, channel_type, enabled, provider, config_json)
    SELECT id, 'whatsapp', false, 'internal', '{}'::jsonb
    FROM businesses
    WHERE NOT EXISTS (
      SELECT 1 FROM business_channels bc
      WHERE bc.business_id = businesses.id AND bc.channel_type = 'whatsapp'
    )
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('business_channels');
}
