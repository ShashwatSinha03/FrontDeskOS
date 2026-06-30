import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('API Key auth middleware', () => {
  it('allows public endpoints without API key', async () => {
    const res = await request(app).get('/api/public/businesses/test-slug');
    expect(res.status).not.toBe(401);
  });

  it('allows chat endpoint without API key', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ businessId: '00000000-0000-0000-0000-000000000000', channelType: 'web_chat', channelIdentity: 'test', content: 'hello' });
    expect(res.status).not.toBe(401);
  });

  it('rejects admin endpoints without API key', async () => {
    const res = await request(app).get('/api/leads?businessId=00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });

  it('accepts valid API key for admin endpoints', async () => {
    const res = await request(app)
      .get('/api/leads?businessId=00000000-0000-0000-0000-000000000000')
      .set('x-api-key', 'test-api-key');
    // requireApiKey passes (x-api-key is valid), but authenticate fails (no Bearer token)
    // A 401 from authenticate means requireApiKey worked
    expect(res.body.error).toBe('Missing or invalid authorization header');
    expect(res.body.error).not.toBe('Unauthorized. Provide a valid x-api-key header.');
  });
});
