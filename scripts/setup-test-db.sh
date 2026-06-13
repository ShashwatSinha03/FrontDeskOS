#!/usr/bin/env bash
set -euo pipefail

echo "=== Nevura Test Database Setup ==="

DB_NAME="${DB_NAME:-frontdeskos_test}"
DB_USER="${DB_USER:-postgres}"
DB_PASS="${DB_PASS:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# 1. Create database if it doesn't exist
echo "Creating database ${DB_NAME}..."
PGPASSWORD="${DB_PASS}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -tc \
  "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 \
  || PGPASSWORD="${DB_PASS}" createdb -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}"

# 2. Run schema
echo "Applying database/schema.sql..."
PGPASSWORD="${DB_PASS}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
  -f "$(dirname "$0")/../database/schema.sql"

# 3. Run BrightSmile seed
echo "Applying database/seed-brightsmile.sql..."
PGPASSWORD="${DB_PASS}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
  -f "$(dirname "$0")/../database/seed-brightsmile.sql"

echo ""
echo "✓ Test database ready at ${DATABASE_URL}"
echo ""
echo "Run tests with:"
echo "  DATABASE_URL='${DATABASE_URL}' npx vitest run src/__tests__/integration.test.ts"
