import { Pool } from 'pg';
import config from './index';

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

// Log pool errors to prevent unhandled rejections
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;
export { pool };
