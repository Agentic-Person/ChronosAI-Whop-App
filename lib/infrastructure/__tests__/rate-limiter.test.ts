/**
 * Rate Limiter Tests
 */

import { RateLimiterService, checkRateLimit } from '../rate-limiting/rate-limiter';
import { RateLimitError } from '../errors';

// Mock Upstash Ratelimit
jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: jest.fn().mockImplementation(() => ({
    limit: jest.fn().mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    }),
  })),
}));

// Mock Vercel KV
jest.mock('@vercel/kv', () => ({
  kv: {
    pipeline: jest.fn(() => ({
      incr: jest.fn(),
      expire: jest.fn(),
      exec: jest.fn().mockResolvedValue([1]),
    })),
  },
}));

describe('RateLimiterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkLimit', () => {
    it('should allow request within limit', async () => {
      const result = await RateLimiterService.checkLimit('user-123', 'api');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });

    it('should return unlimited for enterprise users', async () => {
      const result = await RateLimiterService.checkLimit('user-123', 'chat', 'enterprise');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
      expect(result.remaining).toBe(-1);
    });
  });

  describe('enforceLimit', () => {
    it('should not throw when within limit', async () => {
      await expect(
        RateLimiterService.enforceLimit('user-123', 'api')
      ).resolves.not.toThrow();
    });

    it('should throw RateLimitError when exceeded', async () => {
      const { Ratelimit } = await import('@upstash/ratelimit');
      (Ratelimit as jest.Mock).mockImplementationOnce(() => ({
        limit: jest.fn().mockResolvedValue({
          success: false,
          limit: 100,
          remaining: 0,
          reset: Date.now() + 60000,
        }),
      }));

      await expect(
        RateLimiterService.enforceLimit('user-123', 'api')
      ).rejects.toThrow(RateLimitError);
    });
  });

  describe('getLimitConfig', () => {
    it('should return basic plan limits', () => {
      const config = RateLimiterService.getLimitConfig('chat', 'basic');

      expect(config.limit).toBe(10);
      expect(config.window).toBe('1 m');
    });

    it('should return pro plan limits', () => {
      const config = RateLimiterService.getLimitConfig('chat', 'pro');

      expect(config.limit).toBe(50);
      expect(config.window).toBe('1 m');
    });

    it('should return default limits for unknown endpoint', () => {
      const config = RateLimiterService.getLimitConfig('unknown' as any);

      expect(config.limit).toBe(100);
      expect(config.window).toBe('1 m');
    });
  });
});
