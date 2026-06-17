import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('escalations', {
    first_response_at: {
      type: 'timestamptz',
    },
    returned_to_ai_count: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('escalations', ['first_response_at', 'returned_to_ai_count']);
}
