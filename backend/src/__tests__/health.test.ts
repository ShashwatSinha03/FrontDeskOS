import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('Health endpoint', () => {
  it('returns 200 with status healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('environment');
  });

  it('returns 404 for unknown non-API routes', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
  });
});
