/**
 * Cache Service Tests
 */

import { cache } from '../cache/redis-client';
import { CacheKeys, CacheTTL } from '../cache/cache-keys';

// Mock Vercel KV
jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    scan: jest.fn(),
    exists: jest.fn(),
    ping: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    pipeline: jest.fn(() => ({
      incr: jest.fn(),
      expire: jest.fn(),
      exec: jest.fn().mockResolvedValue([1]),
    })),
    ttl: jest.fn(),
  },
}));

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get/set operations', () => {
    it('should get cached value', async () => {
      const mockValue = { id: '123', name: 'Test' };
      const { kv } = await import('@vercel/kv');
      (kv.get as jest.Mock).mockResolvedValue(mockValue);

      const result = await cache.get('test-key');

      expect(result).toEqual(mockValue);
      expect(kv.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null for missing key', async () => {
      const { kv } = await import('@vercel/kv');
      (kv.get as jest.Mock).mockResolvedValue(null);

      const result = await cache.get('missing-key');

      expect(result).toBeNull();
    });

    it('should set value with TTL', async () => {
      const { kv } = await import('@vercel/kv');
      const value = { test: 'data' };

      await cache.set('test-key', value, 300);

      expect(kv.setex).toHaveBeenCalledWith('test-key', 300, value);
    });
  });

  describe('getOrCompute', () => {
    it('should return cached value if exists', async () => {
      const cachedValue = { cached: true };
      const { kv } = await import('@vercel/kv');
      (kv.get as jest.Mock).mockResolvedValue(cachedValue);

      const computeFn = jest.fn();
      const result = await cache.getOrCompute('key', computeFn, 300);

      expect(result).toEqual(cachedValue);
      expect(computeFn).not.toHaveBeenCalled();
    });

    it('should compute and cache on miss', async () => {
      const computedValue = { computed: true };
      const { kv } = await import('@vercel/kv');
      (kv.get as jest.Mock).mockResolvedValue(null);

      const computeFn = jest.fn().mockResolvedValue(computedValue);
      const result = await cache.getOrCompute('key', computeFn, 300);

      expect(result).toEqual(computedValue);
      expect(computeFn).toHaveBeenCalled();
    });
  });

  describe('increment', () => {
    it('should increment counter', async () => {
      const result = await cache.increment('counter-key', 60);

      expect(result).toBe(1);
    });
  });

  describe('health check', () => {
    it('should return healthy status', async () => {
      const { kv } = await import('@vercel/kv');
      (kv.ping as jest.Mock).mockResolvedValue('PONG');

      const result = await cache.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy on error', async () => {
      const { kv } = await import('@vercel/kv');
      (kv.ping as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const result = await cache.healthCheck();

      expect(result.healthy).toBe(false);
    });
  });
});

describe('CacheKeys', () => {
  it('should generate correct video cache key', () => {
    const key = CacheKeys.video('video-123');
    expect(key).toBe('video:video-123');
  });

  it('should generate correct chat session key', () => {
    const key = CacheKeys.chatSession('session-456');
    expect(key).toBe('chat:session:session-456');
  });

  it('should generate correct rate limit key', () => {
    const key = CacheKeys.rateLimit('user-789', '/api/chat');
    expect(key).toBe('ratelimit:/api/chat:user-789');
  });

  it('should generate deterministic embedding hash', () => {
    const text = 'This is a test embedding text';
    const key1 = CacheKeys.embedding(text);
    const key2 = CacheKeys.embedding(text);

    expect(key1).toBe(key2);
    expect(key1).toMatch(/^embedding:[a-z0-9]+$/);
  });
});

describe('CacheTTL', () => {
  it('should have correct TTL values', () => {
    expect(CacheTTL.SHORT).toBe(60);
    expect(CacheTTL.MEDIUM).toBe(300);
    expect(CacheTTL.LONG).toBe(3600);
    expect(CacheTTL.DAY).toBe(86400);
    expect(CacheTTL.PERMANENT).toBe(-1);
  });
});
