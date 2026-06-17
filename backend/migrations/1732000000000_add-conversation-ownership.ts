import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addType('conversation_ownership', ['ai_active', 'human_pending', 'human_active', 'returned_to_ai']);

  pgm.addColumns('conversations', {
    ownership_status: {
      type: 'conversation_ownership',
      notNull: true,
      default: 'ai_active',
    },
    human_owner_id: {
      type: 'uuid',
      references: 'staff_profiles(user_id)',
      onDelete: 'SET NULL',
    },
    escalated_at: {
      type: 'timestamptz',
    },
    assigned_at: {
      type: 'timestamptz',
    },
  });

  pgm.createIndex('conversations', 'ownership_status');
  pgm.createIndex('conversations', 'human_owner_id');

  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_conversation_ownership_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('conversations', ['ownership_status', 'human_owner_id', 'escalated_at', 'assigned_at']);
  pgm.dropType('conversation_ownership');
}
