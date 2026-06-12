import { Pool } from 'pg';
import config from './index';

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

pool.on('connect', (client) => {
  client.query('SET statement_timeout = 30000');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;
export { pool };
