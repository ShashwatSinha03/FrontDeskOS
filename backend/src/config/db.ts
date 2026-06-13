import { Pool } from 'pg';
import config from './index';
import { logger } from '../lib/logger';

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', { error: err instanceof Error ? err.message : String(err) });
});

export default pool;
export { pool };
