import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '../middleware/rate-limit';

describe('createRateLimiter', () => {
  it('returns a function with rate-limit methods', () => {
    const limiter = createRateLimiter(100);
    expect(typeof limiter).toBe('function');
  });

  it('accepts custom windowMs', () => {
    const limiter = createRateLimiter(50, 60 * 1000);
    expect(typeof limiter).toBe('function');
  });

  it('accepts skip function', () => {
    const limiter = createRateLimiter(100, 15 * 60 * 1000, () => true);
    expect(typeof limiter).toBe('function');
  });
});
