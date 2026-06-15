import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('conversation_workflows', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    conversation_id: { type: 'uuid', notNull: true, references: 'conversations', onDelete: 'cascade' },
    workflow_type: { type: 'varchar(50)', notNull: true },
    workflow_state: { type: 'varchar(50)', notNull: true },
    workflow_version: { type: 'integer', notNull: true, default: 1 },
    collected_data: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    last_asked_field: { type: 'varchar(50)' },
    available_slots: { type: 'jsonb' },
    slots_fetched_at: { type: 'timestamptz' },
    last_updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('conversation_workflows', 'conversation_id');
  pgm.createIndex('conversation_workflows', ['conversation_id', 'workflow_type']);
  pgm.createIndex('conversation_workflows', 'last_updated_at');

  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_conversation_workflows_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.last_updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_conversation_workflows_updated_at
      BEFORE UPDATE ON conversation_workflows
      FOR EACH ROW
      EXECUTE FUNCTION update_conversation_workflows_updated_at();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TRIGGER IF EXISTS trg_conversation_workflows_updated_at ON conversation_workflows');
  pgm.sql('DROP FUNCTION IF EXISTS update_conversation_workflows_updated_at()');
  pgm.dropTable('conversation_workflows');
}
