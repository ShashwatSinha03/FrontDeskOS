import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql("ALTER TYPE conversation_ownership ADD VALUE IF NOT EXISTS 'closed'");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Cannot remove values from an enum in PostgreSQL.
  // The migration is additive only.
}
